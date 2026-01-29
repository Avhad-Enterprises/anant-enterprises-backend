/**
 * Order Service
 * Centralized business logic for order operations
 */

import { sql, eq, and } from 'drizzle-orm';
import { db } from '../../../database';
import { orders } from '../shared/orders.schema';
import { discounts } from '../../discount/shared/discount.schema';
import { discountCodes } from '../../discount/shared/discount-codes.schema';
import { logger } from '../../../utils';

export interface OrderItemInput {
    product_id: string;
    product_name: string;
    product_sku: string;
    quantity: number;
    unit_price: number;
    cost_price: number;
    discount_percentage?: number;
    discount_amount?: number;
    tax_percentage?: number;
    weight?: number;
}

export interface OrderPricingInput {
    items: OrderItemInput[];
    discount_code?: string;
    giftcard_code?: string;
    shipping_amount?: number;
    delivery_price?: number;
    shipping_state: string;
    billing_state: string;
    is_international?: boolean;
}

export interface OrderPricing {
    subtotal: number;
    discount_total: number;
    giftcard_discount: number;
    shipping_amount: number;
    delivery_price: number;
    tax_amount: number;
    cgst: number;
    sgst: number;
    igst: number;
    total_amount: number;
    total_quantity: number;
    items: Array<{
        quantity: number;
        unit_price: number;
        cost_price: number;
        discount_amount: number;
        discount_percentage: number;
        tax_amount: number;
        tax_percentage: number;
        line_subtotal: number;
        line_total: number;
    }>;
}

export interface ValidationResult {
    isValid: boolean;
    errors: string[];
}

class OrderService {
    /**
     * Generate unique order number
     * Format: ORD-YY-NNNNNN (e.g., ORD-24-000123)
     */
    async generateOrderNumber(): Promise<string> {
        const currentYear = new Date().getFullYear().toString().slice(-2);

        // Count orders created this year
        const [countResult] = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(orders)
            .where(sql`${orders.order_number} LIKE ${`ORD-${currentYear}-%`}`);

        const nextNumber = (countResult?.count || 0) + 1;
        const orderNumber = `ORD-${currentYear}-${String(nextNumber).padStart(6, '0')}`;

        logger.info('Generated order number', { orderNumber });
        return orderNumber;
    }

    /**
     * Calculate comprehensive order pricing
     */
    async calculateOrderPricing(input: OrderPricingInput): Promise<OrderPricing> {
        // Calculate item-level pricing
        const processedItems = input.items.map(item => {
            const lineSubtotal = item.quantity * item.unit_price;

            // Calculate discount
            let discountAmount = item.discount_amount || 0;
            if (item.discount_percentage && item.discount_percentage > 0) {
                discountAmount = (lineSubtotal * item.discount_percentage) / 100;
            }

            const lineAfterDiscount = lineSubtotal - discountAmount;

            // Calculate tax
            const taxPercentage = item.tax_percentage || 18; // Default 18% GST
            const taxAmount = (lineAfterDiscount * taxPercentage) / 100;

            const lineTotal = lineAfterDiscount + taxAmount;

            return {
                quantity: item.quantity,
                unit_price: item.unit_price,
                cost_price: item.cost_price,
                discount_amount: discountAmount,
                discount_percentage: item.discount_percentage || 0,
                tax_amount: taxAmount,
                tax_percentage: taxPercentage,
                line_subtotal: lineSubtotal,
                line_total: lineTotal,
            };
        });

        // Calculate subtotal (sum of all line subtotals)
        const subtotal = processedItems.reduce((sum, item) => sum + item.line_subtotal, 0);

        // Calculate total quantity
        const totalQuantity = input.items.reduce((sum, item) => sum + item.quantity, 0);

        // Apply order-level discount code
        let orderLevelDiscount = 0;
        if (input.discount_code) {
            orderLevelDiscount = await this.calculateDiscountAmount(input.discount_code, subtotal);
        }

        // Apply gift card
        let giftcardDiscount = 0;
        if (input.giftcard_code) {
            giftcardDiscount = await this.applyGiftCardDiscount(subtotal - orderLevelDiscount, input.giftcard_code);
        }

        const discountTotal = orderLevelDiscount;
        const subtotalAfterDiscounts = subtotal - discountTotal - giftcardDiscount;

        // Calculate shipping
        const shippingAmount = input.shipping_amount || 0;
        const deliveryPrice = input.delivery_price || shippingAmount;

        // Calculate GST
        const gstCalculation = this.calculateGST(
            subtotalAfterDiscounts,
            input.shipping_state,
            input.billing_state,
            input.is_international || false
        );

        // Calculate final total
        const totalAmount = subtotalAfterDiscounts + shippingAmount + gstCalculation.taxAmount;

        return {
            subtotal,
            discount_total: discountTotal,
            giftcard_discount: giftcardDiscount,
            shipping_amount: shippingAmount,
            delivery_price: deliveryPrice,
            tax_amount: gstCalculation.taxAmount,
            cgst: gstCalculation.cgst,
            sgst: gstCalculation.sgst,
            igst: gstCalculation.igst,
            total_amount: totalAmount,
            total_quantity: totalQuantity,
            items: processedItems,
        };
    }

    /**
     * Calculate discount amount from discount code
     */
    private async calculateDiscountAmount(discountCodeStr: string, subtotal: number): Promise<number> {
        try {
            // Look up the discount code
            const [discountCode] = await db
                .select()
                .from(discountCodes)
                .where(eq(discountCodes.code, discountCodeStr));

            if (!discountCode) {
                logger.warn('Discount code not found', { discountCodeStr });
                return 0;
            }

            // Get the associated discount campaign
            const [discount] = await db
                .select()
                .from(discounts)
                .where(and(
                    eq(discounts.id, discountCode.discount_id),
                    eq(discounts.status, 'active')
                ));

            if (!discount) {
                logger.warn('Discount campaign not found or inactive', { discountCodeStr });
                return 0;
            }

            // Check validity dates
            const now = new Date();
            if (discount.starts_at && new Date(discount.starts_at) > now) {
                logger.warn('Discount not yet valid', { discountCodeStr });
                return 0;
            }
            if (discount.ends_at && new Date(discount.ends_at) < now) {
                logger.warn('Discount expired', { discountCodeStr });
                return 0;
            }

            // Check minimum requirement
            if (
                discount.min_requirement_type === 'min_amount' &&
                discount.min_requirement_value &&
                subtotal < parseFloat(discount.min_requirement_value)
            ) {
                logger.warn('Minimum purchase not met for discount', {
                    discountCodeStr,
                    subtotal,
                    minimum: discount.min_requirement_value
                });
                return 0;
            }

            // Calculate discount based on type
            let discountAmount = 0;
            if (discount.type === 'percentage' && discount.value) {
                discountAmount = (subtotal * parseFloat(discount.value)) / 100;
            } else if (discount.type === 'fixed_amount' && discount.value) {
                discountAmount = parseFloat(discount.value);
            }

            // Apply max discount limit if exists
            if (discount.max_discount_amount && discountAmount > parseFloat(discount.max_discount_amount)) {
                discountAmount = parseFloat(discount.max_discount_amount);
            }

            logger.info('Discount calculated', { discountCodeStr, discountAmount });
            return discountAmount;
        } catch (error) {
            logger.error('Error calculating discount', {
                discountCodeStr,
                error: error instanceof Error ? error.message : String(error)
            });
            return 0;
        }
    }

    /**
     * Apply gift card discount
     */
    async applyGiftCardDiscount(orderTotal: number, giftCardCode: string): Promise<number> {
        try {
            // Look up gift card code
            const [discountCode] = await db
                .select()
                .from(discountCodes)
                .where(eq(discountCodes.code, giftCardCode));

            if (!discountCode) {
                logger.warn('Gift card code not found', { giftCardCode });
                return 0;
            }

            // Get the gift card discount
            const [giftCard] = await db
                .select()
                .from(discounts)
                .where(and(
                    eq(discounts.id, discountCode.discount_id),
                    eq(discounts.status, 'active')
                ));

            if (!giftCard) {
                logger.warn('Gift card campaign not found or inactive', { giftCardCode });
                return 0;
            }

            // Gift cards typically have a fixed value
            const giftCardValue = giftCard.value ? parseFloat(giftCard.value) : 0;

            // Gift card amount cannot exceed order total
            const discountAmount = Math.min(giftCardValue, orderTotal);

            logger.info('Gift card applied', { giftCardCode, discountAmount });
            return discountAmount;
        } catch (error) {
            logger.error('Error applying gift card', {
                giftCardCode,
                error: error instanceof Error ? error.message : String(error)
            });
            return 0;
        }
    }

    /**
     * Calculate GST (India-specific tax calculation)
     * - Intra-state: CGST + SGST (9% + 9% = 18%)
     * - Inter-state: IGST (18%)
     * - International: 0% (handled separately)
     */
    calculateGST(
        subtotal: number,
        shippingState: string,
        billingState: string,
        isInternational: boolean
    ): { cgst: number; sgst: number; igst: number; taxAmount: number } {
        if (isInternational) {
            return { cgst: 0, sgst: 0, igst: 0, taxAmount: 0 };
        }

        const GST_RATE = 18; // 18% GST rate
        const taxAmount = (subtotal * GST_RATE) / 100;

        // Intra-state transaction (same state)
        if (shippingState.toLowerCase() === billingState.toLowerCase()) {
            const cgst = taxAmount / 2; // 9%
            const sgst = taxAmount / 2; // 9%
            return { cgst, sgst, igst: 0, taxAmount };
        }

        // Inter-state transaction (different states)
        return { cgst: 0, sgst: 0, igst: taxAmount, taxAmount };
    }

    /**
     * Validate order data before processing
     */
    validateOrder(orderData: any): ValidationResult {
        const errors: string[] = [];

        // Validate items
        if (!orderData.items || orderData.items.length === 0) {
            errors.push('Order must have at least one item');
        }

        // Validate customer
        if (!orderData.user_id && !orderData.billing_email) {
            errors.push('Order must have a customer or billing email');
        }

        // Validate addresses
        if (!orderData.shipping_address_line1) {
            errors.push('Shipping address is required');
        }

        if (!orderData.billing_address_line1) {
            errors.push('Billing address is required');
        }

        // Validate amounts
        if (orderData.total_amount && orderData.total_amount <= 0) {
            errors.push('Order total must be greater than 0');
        }

        return {
            isValid: errors.length === 0,
            errors,
        };
    }
}

export const orderService = new OrderService();
