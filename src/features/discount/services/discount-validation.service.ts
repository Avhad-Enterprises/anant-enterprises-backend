/**
* Discount Validation Service
*
* Handles discount code validation with comprehensive eligibility checks:
* - Code existence and status
* - Date range validation
* - Usage limits (global, per-customer, per-day)
* - Minimum purchase requirements
* - Product/collection eligibility
* - Customer eligibility (targeting, segments)
* - Geographic restrictions
* - Payment method exclusions
*/

import { eq, and, sql } from 'drizzle-orm';
import { db } from '../../../database';
import {
    discounts,
    type Discount,
} from '../shared/discount.schema';
import { discountCodes } from '../shared/discount-codes.schema';
import {
    discountProducts,
    discountCollections,
} from '../shared/discount-items.schema';
import {
    discountCustomers,
    discountRegions,
    // discountExclusions, // REMOVED - Unused table (31 Jan 2026)
} from '../shared/discount-advanced.schema';
import { discountUsage } from '../shared/discount-usage.schema';
import { logger } from '../../../utils';

// ============================================
// TYPES
// ============================================

export interface CartItem {
    product_id: string;
    variant_id?: string;
    name: string;
    quantity: number;
    price: number;
    collection_ids?: string[];
}

export interface ValidationContext {
    code: string;
    cart_items: CartItem[];
    cart_subtotal: number;
    user_id?: string;
    user_email?: string;
    is_new_customer?: boolean;
    shipping_address_country?: string;
    shipping_address_region?: string;
    payment_method?: string;
    sales_channel?: string;
}

export interface ValidationResult {
    valid: boolean;
    discount?: Discount;
    discount_code?: string;
    applicable_items?: CartItem[];
    discount_amount?: number;
    error_code?: DiscountErrorCode;
    message?: string;
}

export enum DiscountErrorCode {
    INVALID_CODE = 'DISCOUNT_INVALID_CODE',
    EXPIRED = 'DISCOUNT_EXPIRED',
    NOT_STARTED = 'DISCOUNT_NOT_STARTED',
    INACTIVE = 'DISCOUNT_INACTIVE',
    MIN_AMOUNT_NOT_MET = 'DISCOUNT_MIN_AMOUNT_NOT_MET',
    MIN_QUANTITY_NOT_MET = 'DISCOUNT_MIN_QUANTITY_NOT_MET',
    USAGE_LIMIT_REACHED = 'DISCOUNT_USAGE_LIMIT_REACHED',
    ALREADY_USED = 'DISCOUNT_ALREADY_USED',
    NOT_ELIGIBLE = 'DISCOUNT_NOT_ELIGIBLE',
    GEO_RESTRICTED = 'DISCOUNT_GEO_RESTRICTED',
    PAYMENT_EXCLUDED = 'DISCOUNT_PAYMENT_EXCLUDED',
    CHANNEL_EXCLUDED = 'DISCOUNT_CHANNEL_EXCLUDED',
    NO_APPLICABLE_ITEMS = 'DISCOUNT_NO_APPLICABLE_ITEMS',
    NEW_CUSTOMERS_ONLY = 'DISCOUNT_NEW_CUSTOMERS_ONLY',
    RETURNING_CUSTOMERS_ONLY = 'DISCOUNT_RETURNING_CUSTOMERS_ONLY',
    DAILY_LIMIT_REACHED = 'DISCOUNT_DAILY_LIMIT_REACHED',
}

const ERROR_MESSAGES: Record<DiscountErrorCode, string> = {
    [DiscountErrorCode.INVALID_CODE]: 'This discount code doesn\'t exist. Please check and try again.',
    [DiscountErrorCode.EXPIRED]: 'This discount code has expired.',
    [DiscountErrorCode.NOT_STARTED]: 'This discount isn\'t active yet.',
    [DiscountErrorCode.INACTIVE]: 'This discount code is not currently active.',
    [DiscountErrorCode.MIN_AMOUNT_NOT_MET]: 'Your order doesn\'t meet the minimum amount for this discount.',
    [DiscountErrorCode.MIN_QUANTITY_NOT_MET]: 'Your order doesn\'t have enough items for this discount.',
    [DiscountErrorCode.USAGE_LIMIT_REACHED]: 'This discount has reached its usage limit.',
    [DiscountErrorCode.ALREADY_USED]: 'You\'ve already used this discount code.',
    [DiscountErrorCode.NOT_ELIGIBLE]: 'You\'re not eligible for this discount.',
    [DiscountErrorCode.GEO_RESTRICTED]: 'This discount isn\'t available in your region.',
    [DiscountErrorCode.PAYMENT_EXCLUDED]: 'This discount can\'t be used with your selected payment method.',
    [DiscountErrorCode.CHANNEL_EXCLUDED]: 'This discount isn\'t available on this platform.',
    [DiscountErrorCode.NO_APPLICABLE_ITEMS]: 'None of your cart items are eligible for this discount.',
    [DiscountErrorCode.NEW_CUSTOMERS_ONLY]: 'This discount is only available for new customers.',
    [DiscountErrorCode.RETURNING_CUSTOMERS_ONLY]: 'This discount is only available for returning customers.',
    [DiscountErrorCode.DAILY_LIMIT_REACHED]: 'This discount has reached its daily usage limit.',
};

// ============================================
// SERVICE CLASS
// ============================================

class DiscountValidationService {
    /**
     * Validate a discount code with full context
     */
    async validateDiscountCode(context: ValidationContext): Promise<ValidationResult> {
        const normalizedCode = context.code.toUpperCase().trim();

        // 1. Check code exists
        const [codeRow] = await db
            .select()
            .from(discountCodes)
            .where(eq(discountCodes.code, normalizedCode));

        if (!codeRow) {
            return this.error(DiscountErrorCode.INVALID_CODE);
        }

        // 2. Get the discount
        const [discount] = await db
            .select()
            .from(discounts)
            .where(and(eq(discounts.id, codeRow.discount_id), eq(discounts.is_deleted, false)));

        if (!discount) {
            return this.error(DiscountErrorCode.INVALID_CODE);
        }

        // 3. Check status
        const statusCheck = this.checkStatus(discount);
        if (!statusCheck.valid) return statusCheck;

        // 4. Check date range
        const dateCheck = this.checkDateRange(discount);
        if (!dateCheck.valid) return dateCheck;

        // 5. Check global usage limit
        const globalUsageCheck = await this.checkGlobalUsageLimit(discount, codeRow);
        if (!globalUsageCheck.valid) return globalUsageCheck;

        // 6. Check per-customer usage
        if (context.user_id) {
            const customerUsageCheck = await this.checkCustomerUsage(discount, codeRow, context.user_id);
            if (!customerUsageCheck.valid) return customerUsageCheck;
        }

        // 7. Check daily usage limit
        if (discount.usage_per_day) {
            const dailyCheck = await this.checkDailyUsage(discount);
            if (!dailyCheck.valid) return dailyCheck;
        }

        // 8. Check minimum requirements
        const minCheck = this.checkMinimumRequirements(discount, context);
        if (!minCheck.valid) return minCheck;

        // 9. Check customer eligibility (new/returning)
        const customerTypeCheck = await this.checkCustomerType(discount, context);
        if (!customerTypeCheck.valid) return customerTypeCheck;

        // 10. Check customer targeting
        if (discount.target_audience !== 'all') {
            const targetCheck = await this.checkCustomerTargeting(discount, context);
            if (!targetCheck.valid) return targetCheck;
        }

        // 11. Check geographic restrictions
        if (discount.geo_restriction !== 'none') {
            const geoCheck = await this.checkGeoRestriction(discount, context);
            if (!geoCheck.valid) return geoCheck;
        }

        // 12. Check exclusions (payment method, sales channel) - REMOVED (31 Jan 2026)
        // const exclusionCheck = await this.checkExclusions(discount, context);
        // if (!exclusionCheck.valid) return exclusionCheck;

        // 13. Check product eligibility and get applicable items
        const productCheck = await this.checkProductEligibility(discount, context);
        if (!productCheck.valid) return productCheck;

        logger.info(`Discount code ${normalizedCode} validated successfully for ${context.user_id || 'guest'}`);

        return {
            valid: true,
            discount,
            discount_code: normalizedCode,
            applicable_items: productCheck.applicable_items,
        };
    }

    // ============================================
    // VALIDATION CHECKS
    // ============================================

    private checkStatus(discount: Discount): ValidationResult {
        if (discount.status !== 'active') {
            if (discount.status === 'scheduled') {
                return this.error(DiscountErrorCode.NOT_STARTED);
            }
            if (discount.status === 'expired') {
                return this.error(DiscountErrorCode.EXPIRED);
            }
            return this.error(DiscountErrorCode.INACTIVE);
        }
        return { valid: true };
    }

    private checkDateRange(discount: Discount): ValidationResult {
        const now = new Date();

        if (discount.starts_at > now) {
            return this.error(DiscountErrorCode.NOT_STARTED);
        }

        if (discount.ends_at && discount.ends_at < now) {
            return this.error(DiscountErrorCode.EXPIRED);
        }

        return { valid: true };
    }

    private async checkGlobalUsageLimit(
        discount: Discount,
        codeRow: any
    ): Promise<ValidationResult> {
        // Check discount-level limit
        if (discount.usage_limit !== null) {
            const usageCount = discount.total_usage_count || 0;
            if (usageCount >= discount.usage_limit) {
                return this.error(DiscountErrorCode.USAGE_LIMIT_REACHED);
            }
        }

        // Check code-level limit
        if (codeRow.usage_limit !== null) {
            if (codeRow.usage_count >= codeRow.usage_limit) {
                return this.error(DiscountErrorCode.USAGE_LIMIT_REACHED);
            }
        }

        return { valid: true };
    }

    private async checkCustomerUsage(
        discount: Discount,
        codeRow: any,
        userId: string
    ): Promise<ValidationResult> {
        // Check once_per_customer flag
        if (discount.once_per_customer) {
            const existingUsage = await db
                .select({ count: sql<number>`count(*)::int` })
                .from(discountUsage)
                .where(and(
                    eq(discountUsage.discount_id, discount.id),
                    eq(discountUsage.user_id, userId)
                ));

            if (existingUsage[0].count > 0) {
                return this.error(DiscountErrorCode.ALREADY_USED);
            }
        }

        // Check usage_per_customer limit
        if (discount.usage_per_customer !== null) {
            const existingUsage = await db
                .select({ count: sql<number>`count(*)::int` })
                .from(discountUsage)
                .where(and(
                    eq(discountUsage.discount_id, discount.id),
                    eq(discountUsage.user_id, userId)
                ));

            if (existingUsage[0].count >= discount.usage_per_customer) {
                return this.error(DiscountErrorCode.ALREADY_USED);
            }
        }

        // Check code-level per-customer limit
        if (codeRow.max_uses_per_customer !== null) {
            const existingUsage = await db
                .select({ count: sql<number>`count(*)::int` })
                .from(discountUsage)
                .where(and(
                    eq(discountUsage.discount_code, codeRow.code),
                    eq(discountUsage.user_id, userId)
                ));

            if (existingUsage[0].count >= codeRow.max_uses_per_customer) {
                return this.error(DiscountErrorCode.ALREADY_USED);
            }
        }

        return { valid: true };
    }

    private async checkDailyUsage(discount: Discount): Promise<ValidationResult> {
        if (!discount.usage_per_day) {
            return { valid: true };
        }

        const todayUsage = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(discountUsage)
            .where(and(
                eq(discountUsage.discount_id, discount.id),
                sql`DATE(used_at) = CURRENT_DATE`
            ));

        if (todayUsage[0].count >= discount.usage_per_day) {
            return this.error(DiscountErrorCode.DAILY_LIMIT_REACHED);
        }

        return { valid: true };
    }

    private checkMinimumRequirements(
        discount: Discount,
        context: ValidationContext
    ): ValidationResult {
        if (discount.min_requirement_type === 'min_amount' && discount.min_requirement_value) {
            const minAmount = parseFloat(discount.min_requirement_value);
            if (context.cart_subtotal < minAmount) {
                return {
                    valid: false,
                    error_code: DiscountErrorCode.MIN_AMOUNT_NOT_MET,
                    message: `Add ₹${(minAmount - context.cart_subtotal).toFixed(2)} more to use this discount.`,
                };
            }
        }

        if (discount.min_requirement_type === 'min_quantity' && discount.min_requirement_value) {
            const minQuantity = parseInt(discount.min_requirement_value);
            const totalQuantity = context.cart_items.reduce((sum, item) => sum + item.quantity, 0);
            if (totalQuantity < minQuantity) {
                return {
                    valid: false,
                    error_code: DiscountErrorCode.MIN_QUANTITY_NOT_MET,
                    message: `Add ${minQuantity - totalQuantity} more item(s) to use this discount.`,
                };
            }
        }

        return { valid: true };
    }

    private async checkCustomerType(
        discount: Discount,
        context: ValidationContext
    ): Promise<ValidationResult> {
        if (discount.limit_new_customers && context.is_new_customer === false) {
            return this.error(DiscountErrorCode.NEW_CUSTOMERS_ONLY);
        }

        if (discount.limit_returning_customers && context.is_new_customer === true) {
            return this.error(DiscountErrorCode.RETURNING_CUSTOMERS_ONLY);
        }

        return { valid: true };
    }

    private async checkCustomerTargeting(
        discount: Discount,
        context: ValidationContext
    ): Promise<ValidationResult> {
        if (discount.target_audience === 'specific_customers' && context.user_id) {
            const isAllowed = await db
                .select()
                .from(discountCustomers)
                .where(and(
                    eq(discountCustomers.discount_id, discount.id),
                    eq(discountCustomers.user_id, context.user_id)
                ));

            if (isAllowed.length === 0) {
                return this.error(DiscountErrorCode.NOT_ELIGIBLE);
            }
        }

        // Segment targeting would require a user segments system
        // For now, we'll just check if any segments are defined
        if (discount.target_audience === 'segments') {
            // TODO: Implement segment checking when user segments are available
            logger.warn('Segment targeting not yet implemented, allowing discount');
        }

        return { valid: true };
    }

    private async checkGeoRestriction(
        discount: Discount,
        context: ValidationContext
    ): Promise<ValidationResult> {
        if (discount.geo_restriction !== 'specific_regions') {
            return { valid: true };
        }

        if (!context.shipping_address_country) {
            // Can't validate without address, allow for now (will be checked at checkout)
            return { valid: true };
        }

        const allowedRegions = await db
            .select()
            .from(discountRegions)
            .where(eq(discountRegions.discount_id, discount.id));

        if (allowedRegions.length === 0) {
            return { valid: true }; // No restrictions defined
        }

        const isAllowed = allowedRegions.some(
            (r) =>
                r.country_code.toLowerCase() === context.shipping_address_country?.toLowerCase() &&
                (!r.region_code || r.region_code === context.shipping_address_region)
        );

        if (!isAllowed) {
            return this.error(DiscountErrorCode.GEO_RESTRICTED);
        }

        return { valid: true };
    }

    // REMOVED - checkExclusions method (31 Jan 2026) - discountExclusions table removed
    // private async checkExclusions(
    //     discount: Discount,
    //     context: ValidationContext
    // ): Promise<ValidationResult> {
    //     const exclusions = await db
    //         .select()
    //         .from(discountExclusions)
    //         .where(eq(discountExclusions.discount_id, discount.id));

    //     // Check payment method exclusions
    //     if (context.payment_method) {
    //         const paymentExcluded = exclusions.find(
    //             (e) =>
    //                 e.exclusion_type === 'payment_method' &&
    //                 e.exclusion_value.toLowerCase() === context.payment_method?.toLowerCase()
    //         );
    //         if (paymentExcluded) {
    //             return this.error(DiscountErrorCode.PAYMENT_EXCLUDED);
    //         }
    //     }

    //     // Check sales channel exclusions
    //     if (context.sales_channel) {
    //         const channelExcluded = exclusions.find(
    //             (e) =>
    //                 e.exclusion_type === 'sales_channel' &&
    //                 e.exclusion_value.toLowerCase() === context.sales_channel?.toLowerCase()
    //         );
    //         if (channelExcluded) {
    //             return this.error(DiscountErrorCode.CHANNEL_EXCLUDED);
    //         }
    //     }

    //     return { valid: true };
    // }

    private async checkProductEligibility(
        discount: Discount,
        context: ValidationContext
    ): Promise<ValidationResult & { applicable_items?: CartItem[] }> {
        // If applies to entire order, all items are applicable
        if (discount.applies_to === 'entire_order') {
            // REMOVED - Product exclusions logic (31 Jan 2026) - discountExclusions table removed
            // const exclusions = await db
            //     .select()
            //     .from(discountExclusions)
            //     .where(and(
            //         eq(discountExclusions.discount_id, discount.id),
            //         eq(discountExclusions.exclusion_type, 'product')
            //     ));

            // const excludedProductIds = new Set(exclusions.map((e) => e.exclusion_value));
            // const applicableItems = context.cart_items.filter(
            //     (item) => !excludedProductIds.has(item.product_id)
            // );

            // if (applicableItems.length === 0) {
            //     return this.error(DiscountErrorCode.NO_APPLICABLE_ITEMS);
            // }

            // return { valid: true, applicable_items: applicableItems };

            // Since exclusions are removed, all items are applicable for entire order discounts
            return { valid: true, applicable_items: context.cart_items };
        }

        // If applies to specific products
        if (discount.applies_to === 'specific_products') {
            const allowedProducts = await db
                .select()
                .from(discountProducts)
                .where(eq(discountProducts.discount_id, discount.id));

            const allowedProductIds = new Set(allowedProducts.map((p) => p.product_id));
            const applicableItems = context.cart_items.filter((item) =>
                allowedProductIds.has(item.product_id)
            );

            if (applicableItems.length === 0) {
                return this.error(DiscountErrorCode.NO_APPLICABLE_ITEMS);
            }

            return { valid: true, applicable_items: applicableItems };
        }

        // If applies to specific collections
        if (discount.applies_to === 'specific_collections') {
            const allowedCollections = await db
                .select()
                .from(discountCollections)
                .where(eq(discountCollections.discount_id, discount.id));

            const allowedCollectionIds = new Set(allowedCollections.map((c) => c.collection_id));
            const applicableItems = context.cart_items.filter((item) =>
                item.collection_ids?.some((cid) => allowedCollectionIds.has(cid))
            );

            if (applicableItems.length === 0) {
                return this.error(DiscountErrorCode.NO_APPLICABLE_ITEMS);
            }

            return { valid: true, applicable_items: applicableItems };
        }

        return { valid: true, applicable_items: context.cart_items };
    }

    // ============================================
    // HELPERS
    // ============================================

    private error(code: DiscountErrorCode): ValidationResult {
        return {
            valid: false,
            error_code: code,
            message: ERROR_MESSAGES[code],
        };
    }
}

export const discountValidationService = new DiscountValidationService();
