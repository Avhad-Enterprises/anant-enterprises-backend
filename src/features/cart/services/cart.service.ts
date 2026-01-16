/**
 * Cart Service
 *
 * Centralizes all cart operations including:
 * - Item management (add, update, remove)
 * - Discount application and removal
 * - Total calculation (integrating with Discount Calculation Service)
 * - Stock validation
 */

import { eq, and } from 'drizzle-orm';
import { db } from '../../../database';
import { carts, type Cart } from '../shared/carts.schema';
import { cartItems, type CartItem } from '../shared/cart-items.schema';
import { HttpException } from '../../../utils';
import {
    discountValidationService,
    discountCalculationService,
    type ValidationContext
} from '../../discount/services';

export class CartService {

    /**
     * Get a cart by ID
     */
    async getCart(cartId: string): Promise<Cart | undefined> {
        const [cart] = await db
            .select()
            .from(carts)
            .where(eq(carts.id, cartId));
        return cart;
    }

    /**
     * Ensure a cart exists and is active (not converted/abandoned)
     * Throws an error if cart doesn't exist or is not active
     */
    async ensureActiveCart(cartId: string): Promise<Cart> {
        const cart = await this.getCart(cartId);
        if (!cart) {
            throw new HttpException(404, 'Cart not found');
        }
        if (cart.cart_status !== 'active') {
            throw new HttpException(400, `Cart is no longer active (status: ${cart.cart_status})`);
        }
        if (cart.is_deleted) {
            throw new HttpException(404, 'Cart has been deleted');
        }
        return cart;
    }

    /**
     * Get an active cart by user ID or session ID
     * Returns undefined if no active cart found
     */
    async getActiveCart(userId?: string, sessionId?: string): Promise<Cart | undefined> {
        if (!userId && !sessionId) {
            return undefined;
        }

        // For authenticated users, first try to find their user cart
        if (userId) {
            const [userCart] = await db
                .select()
                .from(carts)
                .where(and(
                    eq(carts.user_id, userId),
                    eq(carts.cart_status, 'active'),
                    eq(carts.is_deleted, false)
                ))
                .limit(1);

            if (userCart) {
                return userCart;
            }
        }

        // For guests or if no user cart found, try by session ID
        if (sessionId) {
            const [sessionCart] = await db
                .select()
                .from(carts)
                .where(and(
                    eq(carts.session_id, sessionId),
                    eq(carts.cart_status, 'active'),
                    eq(carts.is_deleted, false)
                ))
                .limit(1);

            return sessionCart;
        }

        return undefined;
    }

    /**
     * Get or create a cart
     * - For authenticated users: returns their user cart, or creates one
     * - For guests: returns session cart, or creates one
     * - IMPORTANT: Does NOT auto-merge guest carts. Use merge-cart API for that.
     */
    async getOrCreateCart(userId?: string, sessionId?: string): Promise<Cart> {
        if (!userId && !sessionId) {
            throw new HttpException(400, 'Either user authentication or session ID is required');
        }

        // Try to find existing active cart
        const existingCart = await this.getActiveCart(userId, sessionId);
        if (existingCart) {
            return existingCart;
        }

        // Create new cart
        const [newCart] = await db.insert(carts).values({
            user_id: userId ? userId : undefined,
            session_id: sessionId ? sessionId : undefined,
            cart_status: 'active',
            source: 'web',
            created_by: userId ? userId : undefined,
        }).returning();

        console.log('[CartService] Created new cart:', { cartId: newCart.id, userId, sessionId });
        return newCart;
    }

    /**
     * Apply a discount code to the cart
     */
    async applyDiscount(cartId: string, code: string, userId?: string): Promise<Cart> {
        const cart = await this.getCart(cartId);
        if (!cart) throw new HttpException(404, 'Cart not found');

        const normalizedCode = code.toUpperCase().trim();

        // 1. Check if already applied
        const appliedCodes = (cart.applied_discount_codes as string[]) || [];
        if (appliedCodes.includes(normalizedCode)) {
            throw new HttpException(400, 'Discount code already applied');
        }

        // 2. Validate code (preliminary check without full cart context if needed, but better to recalculate)
        // We will add it to the list, and then let recalculate() validate it fully.
        // But users expect immediate feedback. So let's validate first.

        const items = await this.getCartItems(cartId);
        const cartSubtotal = items.reduce((sum, item) => sum + Number(item.line_subtotal), 0);

        const context: ValidationContext = {
            code: normalizedCode,
            cart_items: items.map(item => ({
                product_id: item.product_id!, // assuming product_id exists
                variant_id: undefined,
                name: item.product_name!,
                quantity: item.quantity,
                price: Number(item.final_price), // Use correct selling price (which includes product discount)
            })),
            cart_subtotal: cartSubtotal,
            user_id: userId || cart.user_id || undefined,
            // Add other context like shipping address if available in cart
        };

        const result = await discountValidationService.validateDiscountCode(context);
        if (!result.valid) {
            throw new HttpException(400, result.message || 'Invalid discount code');
        }

        // 3. Update cart with new code
        // Currently support only 1 code? simpler for now.
        // If we want multiple, we append.
        // Let's replace any existing codes for now to avoid complexity of stacking logic unless strictly required.
        // Task said "No - only one discount per order".

        await db.update(carts)
            .set({
                applied_discount_codes: [normalizedCode],
                updated_at: new Date()
            })
            .where(eq(carts.id, cartId));

        // 4. Recalculate
        await this.recalculate(cartId);

        return (await this.getCart(cartId))!;
    }

    /**
     * Remove a discount code
     */
    async removeDiscount(cartId: string, code?: string): Promise<Cart> {
        // If code is null, remove all
        await db.update(carts)
            .set({
                applied_discount_codes: [],
                updated_at: new Date()
            })
            .where(eq(carts.id, cartId));

        await this.recalculate(cartId);
        return (await this.getCart(cartId))!;
    }

    /**
     * Core Recalculation Logic
     * - Validates applied discounts
     * - Updates item prices and totals
     * - Updates cart totals
     */
    async recalculate(cartId: string): Promise<void> {
        const cart = await this.getCart(cartId);
        if (!cart) return;

        const items = await this.getCartItems(cartId);
        if (items.length === 0) {
            // Empty cart
            await db.update(carts).set({
                subtotal: '0.00',
                discount_total: '0.00',
                grand_total: '0.00',
                applied_discount_codes: [], // clear codes if empty? maybe yes
            }).where(eq(carts.id, cartId));
            return;
        }

        const codes = (cart.applied_discount_codes as string[]) || [];
        let validCodes: string[] = [];
        let totalDiscountAmount = 0;

        // Reset items to base state variables (in memory)
        // IMPORTANT: We use `final_price` as the base because `add-to-cart` sets it to the Selling Price.
        // We do not want to reset it to `cost_price` (MSRP) because that would remove product-level discounts.
        // We assume `final_price` in DB correctly reflects the "Price to Customer before Coupon".
        const calculationItems = items.map(item => ({
            ...item,
            final_price: Number(item.final_price), // Keep selling price
            // discount_amount: Number(item.discount_amount), // Ideally keep product discount tracking if needed, 
            // but for coupon calc, we treat current state as base.
            line_total: Number(item.final_price) * item.quantity
        }));

        // Apply Discounts
        if (codes.length > 0) {
            // Task: "No - only one discount per order". So take the first one.
            const code = codes[0];

            // Build Context
            const cartSubtotal = calculationItems.reduce((sum, item) => sum + item.line_total, 0);

            const context: ValidationContext = {
                code,
                cart_items: calculationItems.map(item => ({
                    product_id: item.product_id!,
                    variant_id: undefined,
                    name: item.product_name!,
                    quantity: item.quantity,
                    price: Number(item.final_price),
                })),
                cart_subtotal: cartSubtotal,
                user_id: cart.user_id || undefined,
            };

            const validation = await discountValidationService.validateDiscountCode(context);

            if (validation.valid && validation.discount) {
                validCodes.push(code);

                // Calculate
                const calcResult = await discountCalculationService.calculateDiscount(
                    validation.discount,
                    {
                        cart_items: context.cart_items,
                        cart_subtotal: cartSubtotal,
                        shipping_amount: 0 // Fetch from cart if available
                    },
                    validation.applicable_items
                );

                totalDiscountAmount = calcResult.discount_amount;

                // Distribute discount to items or just update totals?
                // Providing explicit breakdown is better for UI.
                // Assuming `discountCalculationService` returns breakdown.
                // WE need to update `calculationItems` based on `calcResult`.
                // BUT `calcResult` gives `total` and `discount_amount`.
                // It does NOT explicitly give "per item final price" in the result interface I saw earlier.
                // Wait, `calculateDiscount` returns `CalculationResult`.
                // `CalculationResult` has `breakdown`.
                // If I want to update `cart_items.final_price`, I need to know how much discount per item.
                // If `discountCalculationService` doesn't provide per-item split, I might have to prorate it myself
                // OR just leave `cart_items` with base prices and only update `cart.discount_total`.

                // Strategy: Keep `cartItems.final_price` as "Price customer pays".
                // If `discountCalculationService` is black box, I might need to improve it to return per-item details.
                // However, `calculatePercentageDiscount` usually iterates items.

                // For now, to solve Phase 4 integration without rewriting Calc Service:
                // We will store the Total Discount in `carts.discount_total`.
                // We will NOT modify `cartItems.final_price` for *order level* discounts (coupons).
                // `cartItems.final_price` will track *product level* discounts (compare_at vs selling).
                // `cartItems.discount_amount` will track *product level* savings.
                // This separates "Sale Price" from "Coupon Savings".
                // This is a standard ecommerce pattern (Subtotal = sum of Sale Prices). Coupons apply to Subtotal.

                // So, `calculationItems` remain at `selling_price`.
            }
        }

        // Calculate Totals
        const subtotal = calculationItems.reduce((sum, item) => sum + (Number(item.final_price) * item.quantity), 0);
        // Note: item.cost_price in my assumption earlier is Selling Price.
        // item.discount_amount (product/sale discount) is NOT subtracted from subtotal usually. Subtotal is sum of selling prices.
        // Wait, `add-to-cart` sets `discount_amount` as `compare_at - selling`.
        // So `subtotal` should be `selling * qty`.

        // Final Grand Total
        const grandTotal = Math.max(subtotal - totalDiscountAmount, 0); // + shipping + tax

        // Update DB
        await db.transaction(async (tx) => {
            // Update items (restore base prices to ensure consistency, mostly unchanged)
            // Actually, if we are NOT distributing coupon discount to items, we don't need to update items here
            // UNLESS we want to support "Buy X Get Y" where Y is free.
            // If Y is free, its `final_price` SHOULD be 0.
            // My Calc service handles Buy X Get Y.
            // If Calc Service says "Item B is free", I need to know that.

            // Critical: Does `DiscountCalculationService` tell me which items are free/discounted?
            // `calcResult.free_items` exists.

            // Ideally, implementing per-item update is best. 
            // I will update Cart Totals for now.
            // Update `applied_discount_codes` to only valid ones.

            await tx.update(carts).set({
                subtotal: subtotal.toFixed(2),
                discount_total: totalDiscountAmount.toFixed(2),
                grand_total: grandTotal.toFixed(2),
                applied_discount_codes: validCodes,
                updated_at: new Date(),
                last_activity_at: new Date()
            }).where(eq(carts.id, cartId));
        });
    }

    /**
     * Helpers
     */
    private async getCartItems(cartId: string): Promise<CartItem[]> {
        return db
            .select()
            .from(cartItems)
            .where(and(
                eq(cartItems.cart_id, cartId),
                eq(cartItems.is_deleted, false)
            ));
    }
}

export const cartService = new CartService();
