/**
 * Discount Calculation Service
 *
 * Calculates discount amounts for different discount types:
 * - Percentage discounts (with optional cap)
 * - Fixed amount discounts
 * - Buy X Get Y promotions
 * - Free shipping
 */

import { eq } from 'drizzle-orm';
import { db } from '../../../database';
import { type Discount } from '../shared/discount.schema';
import {
    discountBuyXProducts,
    discountBuyXCollections,
    discountGetYProducts,
    discountGetYCollections,
} from '../shared/discount-advanced.schema';
import { logger } from '../../../utils';

// ============================================
// TYPES
// ============================================

export interface CartItem {
    product_id: string;
    variant_id?: string;
    name: string;
    quantity: number;
    price: number; // Unit price
    collection_ids?: string[];
}

export interface CalculationContext {
    cart_items: CartItem[];
    cart_subtotal: number;
    shipping_amount?: number;
}

export interface CalculationResult {
    discount_amount: number;
    discount_type: string;
    breakdown: DiscountBreakdown[];
    free_items?: FreeItem[];
    free_shipping_amount?: number;
}

export interface DiscountBreakdown {
    product_id: string;
    product_name: string;
    original_price: number;
    discount_amount: number;
    final_price: number;
    quantity: number;
}

export interface FreeItem {
    product_id: string;
    product_name: string;
    quantity: number;
    original_price: number;
    discount_amount: number;
}

export interface BuyXGetYResult {
    times_triggered: number;
    reward_items: FreeItem[];
    total_savings: number;
}

// ============================================
// SERVICE CLASS
// ============================================

class DiscountCalculationService {
    /**
     * Calculate discount amount for a given discount and cart
     */
    async calculateDiscount(
        discount: Discount,
        context: CalculationContext,
        applicableItems?: CartItem[]
    ): Promise<CalculationResult> {
        const items = applicableItems || context.cart_items;

        switch (discount.type) {
            case 'percentage':
                return this.calculatePercentageDiscount(discount, items);

            case 'fixed_amount':
                return this.calculateFixedDiscount(discount, items);

            case 'buy_x_get_y':
                return this.calculateBuyXGetY(discount, context);

            case 'free_shipping':
                return this.calculateFreeShipping(discount, context);

            default:
                logger.warn(`Unknown discount type: ${discount.type}`);
                return {
                    discount_amount: 0,
                    discount_type: discount.type,
                    breakdown: [],
                };
        }
    }

    /**
     * Calculate percentage discount
     */
    private calculatePercentageDiscount(
        discount: Discount,
        items: CartItem[]
    ): CalculationResult {
        const percentage = parseFloat(discount.value || '0');
        const maxCap = discount.max_discount_amount
            ? parseFloat(discount.max_discount_amount)
            : null;

        const breakdown: DiscountBreakdown[] = [];
        let totalDiscount = 0;

        for (const item of items) {
            const itemTotal = item.price * item.quantity;
            let itemDiscount = itemTotal * (percentage / 100);

            // Apply proportional cap if needed
            if (maxCap !== null) {
                const applicableTotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
                const proportion = itemTotal / applicableTotal;
                const proportionalCap = maxCap * proportion;
                itemDiscount = Math.min(itemDiscount, proportionalCap);
            }

            totalDiscount += itemDiscount;

            breakdown.push({
                product_id: item.product_id,
                product_name: item.name,
                original_price: itemTotal,
                discount_amount: itemDiscount,
                final_price: itemTotal - itemDiscount,
                quantity: item.quantity,
            });
        }

        // Apply total cap
        if (maxCap !== null && totalDiscount > maxCap) {
            const scaleFactor = maxCap / totalDiscount;
            totalDiscount = maxCap;

            // Scale down breakdown proportionally
            for (const b of breakdown) {
                b.discount_amount *= scaleFactor;
                b.final_price = b.original_price - b.discount_amount;
            }
        }

        return {
            discount_amount: Math.round(totalDiscount * 100) / 100,
            discount_type: 'percentage',
            breakdown,
        };
    }

    /**
     * Calculate fixed amount discount
     */
    private calculateFixedDiscount(
        discount: Discount,
        items: CartItem[]
    ): CalculationResult {
        const fixedAmount = parseFloat(discount.value || '0');
        const applicableTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

        // Can't discount more than the applicable total
        const actualDiscount = Math.min(fixedAmount, applicableTotal);

        const breakdown: DiscountBreakdown[] = [];

        // Distribute discount proportionally across items
        for (const item of items) {
            const itemTotal = item.price * item.quantity;
            const proportion = applicableTotal > 0 ? itemTotal / applicableTotal : 0;
            const itemDiscount = actualDiscount * proportion;

            breakdown.push({
                product_id: item.product_id,
                product_name: item.name,
                original_price: itemTotal,
                discount_amount: itemDiscount,
                final_price: itemTotal - itemDiscount,
                quantity: item.quantity,
            });
        }

        return {
            discount_amount: Math.round(actualDiscount * 100) / 100,
            discount_type: 'fixed_amount',
            breakdown,
        };
    }

    /**
     * Calculate Buy X Get Y discount
     */
    async calculateBuyXGetY(
        discount: Discount,
        context: CalculationContext
    ): Promise<CalculationResult> {
        // Get Buy X products/collections
        const [buyXProducts, buyXCollections] = await Promise.all([
            db.select().from(discountBuyXProducts).where(eq(discountBuyXProducts.discount_id, discount.id)),
            db.select().from(discountBuyXCollections).where(eq(discountBuyXCollections.discount_id, discount.id)),
        ]);

        const buyXProductIds = new Set(buyXProducts.map((p) => p.product_id));
        const buyXCollectionIds = new Set(buyXCollections.map((c) => c.collection_id));

        // Get Get Y products/collections
        const [getYProducts, getYCollections] = await Promise.all([
            db.select().from(discountGetYProducts).where(eq(discountGetYProducts.discount_id, discount.id)),
            db.select().from(discountGetYCollections).where(eq(discountGetYCollections.discount_id, discount.id)),
        ]);

        const getYProductIds = new Set(getYProducts.map((p) => p.product_id));
        const getYCollectionIds = new Set(getYCollections.map((c) => c.collection_id));

        // Find eligible "Buy" items
        const buyItems = context.cart_items.filter((item) => {
            if (buyXProducts.length === 0 && buyXCollections.length === 0) {
                return true; // Any product qualifies
            }
            if (buyXProductIds.has(item.product_id)) return true;
            if (item.collection_ids?.some((cid) => buyXCollectionIds.has(cid))) return true;
            return false;
        });

        // Find eligible "Get" items
        const getItems = context.cart_items.filter((item) => {
            if (discount.get_y_applies_to === 'same') {
                // Same items as buy
                return buyItems.some((b) => b.product_id === item.product_id);
            }
            if (discount.get_y_applies_to === 'cheapest') {
                // All items eligible, will select cheapest
                return true;
            }
            if (getYProductIds.has(item.product_id)) return true;
            if (item.collection_ids?.some((cid) => getYCollectionIds.has(cid))) return true;
            return false;
        });

        // Calculate how many times the trigger is met
        const buyXValue = parseFloat(discount.buy_x_value || '0');
        let timesTriggered = 0;

        if (discount.buy_x_trigger_type === 'quantity') {
            const totalBuyQuantity = discount.buy_x_same_product
                ? Math.max(...buyItems.map((i) => i.quantity))
                : buyItems.reduce((sum, i) => sum + i.quantity, 0);
            timesTriggered = Math.floor(totalBuyQuantity / buyXValue);
        } else if (discount.buy_x_trigger_type === 'amount') {
            const totalBuyAmount = buyItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
            timesTriggered = Math.floor(totalBuyAmount / buyXValue);
        }

        // Apply repeat limit
        if (!discount.buy_x_repeat) {
            timesTriggered = Math.min(timesTriggered, 1);
        }

        if (timesTriggered === 0) {
            return {
                discount_amount: 0,
                discount_type: 'buy_x_get_y',
                breakdown: [],
                free_items: [],
            };
        }

        // Calculate rewards
        const getYQuantity = discount.get_y_quantity || 1;
        const maxRewards = discount.get_y_max_rewards || Infinity;
        let totalRewardsToGive = Math.min(timesTriggered * getYQuantity, maxRewards);

        // Sort get items by price for cheapest selection
        const sortedGetItems = [...getItems].sort((a, b) => a.price - b.price);

        const freeItems: FreeItem[] = [];
        let totalSavings = 0;
        let rewardsGiven = 0;

        for (const item of sortedGetItems) {
            if (rewardsGiven >= totalRewardsToGive) break;

            const rewardsForThisItem = Math.min(item.quantity, totalRewardsToGive - rewardsGiven);
            if (rewardsForThisItem <= 0) continue;

            let itemSavings = 0;

            switch (discount.get_y_type) {
                case 'free':
                    itemSavings = item.price * rewardsForThisItem;
                    break;

                case 'percentage':
                    const percentage = parseFloat(discount.get_y_value || '0');
                    itemSavings = item.price * rewardsForThisItem * (percentage / 100);
                    break;

                case 'amount':
                    const amountOff = parseFloat(discount.get_y_value || '0');
                    itemSavings = Math.min(amountOff, item.price) * rewardsForThisItem;
                    break;

                case 'fixed_price':
                    const fixedPrice = parseFloat(discount.get_y_value || '0');
                    itemSavings = Math.max(0, item.price - fixedPrice) * rewardsForThisItem;
                    break;
            }

            freeItems.push({
                product_id: item.product_id,
                product_name: item.name,
                quantity: rewardsForThisItem,
                original_price: item.price * rewardsForThisItem,
                discount_amount: itemSavings,
            });

            totalSavings += itemSavings;
            rewardsGiven += rewardsForThisItem;
        }

        return {
            discount_amount: Math.round(totalSavings * 100) / 100,
            discount_type: 'buy_x_get_y',
            breakdown: [],
            free_items: freeItems,
        };
    }

    /**
     * Calculate free shipping discount
     */
    private calculateFreeShipping(
        discount: Discount,
        context: CalculationContext
    ): CalculationResult {
        if (!context.shipping_amount || context.shipping_amount <= 0) {
            return {
                discount_amount: 0,
                discount_type: 'free_shipping',
                breakdown: [],
                free_shipping_amount: 0,
            };
        }

        // Check minimum requirements for free shipping
        if (discount.shipping_min_amount) {
            const minAmount = parseFloat(discount.shipping_min_amount);
            if (context.cart_subtotal < minAmount) {
                return {
                    discount_amount: 0,
                    discount_type: 'free_shipping',
                    breakdown: [],
                    free_shipping_amount: 0,
                };
            }
        }

        if (discount.shipping_min_items) {
            const totalItems = context.cart_items.reduce((sum, i) => sum + i.quantity, 0);
            if (totalItems < discount.shipping_min_items) {
                return {
                    discount_amount: 0,
                    discount_type: 'free_shipping',
                    breakdown: [],
                    free_shipping_amount: 0,
                };
            }
        }

        // Apply shipping discount (with optional cap)
        let freeShippingAmount = context.shipping_amount;
        if (discount.shipping_cap) {
            const cap = parseFloat(discount.shipping_cap);
            freeShippingAmount = Math.min(freeShippingAmount, cap);
        }

        return {
            discount_amount: Math.round(freeShippingAmount * 100) / 100,
            discount_type: 'free_shipping',
            breakdown: [],
            free_shipping_amount: freeShippingAmount,
        };
    }

    /**
     * Preview discount without full validation
     * Useful for showing potential savings before applying
     */
    async previewDiscount(
        discount: Discount,
        context: CalculationContext
    ): Promise<{ potential_savings: number; type: string }> {
        const result = await this.calculateDiscount(discount, context);
        return {
            potential_savings: result.discount_amount,
            type: result.discount_type,
        };
    }
}

export const discountCalculationService = new DiscountCalculationService();
