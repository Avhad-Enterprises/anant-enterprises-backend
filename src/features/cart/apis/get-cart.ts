/**
 * GET /api/cart
 * Get current user's cart with all items
 * - Includes product details, stock status, and computed totals
 */

import { Router, Response, Request } from 'express';
import { eq, and, sql } from 'drizzle-orm';
import { ResponseFormatter } from '../../../utils';
import { db } from '../../../database';
import { carts } from '../shared/carts.schema';
import { cartItems } from '../shared/cart-items.schema';
import { products } from '../../product/shared/products.schema';
import { inventory } from '../../inventory/shared/inventory.schema';
import { RequestWithUser } from '../../../interfaces';

interface CartItemResponse {
    id: string;
    product_id: string | null;
    bundle_id: string | null;
    quantity: number;
    cost_price: string;
    final_price: string;
    discount_amount: string;
    line_subtotal: string;
    line_total: string;
    product_name: string | null;
    product_image_url: string | null;
    product_sku: string | null;
    // Computed fields
    inStock: boolean;
    availableStock: number;
    priceChanged: boolean;
    currentPrice: string | null;
}

// Discount metadata for frontend display
interface AppliedDiscountInfo {
    code: string;
    type: 'percentage' | 'fixed_amount' | 'free_shipping' | 'buy_x_get_y';
    title: string;
    value: string | null;
    savings: string;
}

interface CartResponse {
    id: string | null;
    currency: string;
    subtotal: string;
    discount_total: string;
    shipping_total: string;
    tax_total: string;
    grand_total: string;
    applied_discount_codes: string[];
    applied_giftcard_codes: string[];
    applied_discounts: AppliedDiscountInfo[]; // NEW: Discount metadata
    items: CartItemResponse[];
    itemCount: number;
    totalQuantity: number;
    hasStockIssues: boolean;
    hasPriceChanges: boolean;
    hasUnmergedGuestCart: boolean; // True if there's a guest cart that should be merged
}

const handler = async (req: Request, res: Response) => {
    const userReq = req as RequestWithUser;
    const userId = userReq.userId || null;
    const sessionId = req.headers['x-session-id'] as string || null;

    if (!userId && !sessionId) {
        return ResponseFormatter.success(res, {
            id: null,
            currency: 'INR',
            subtotal: '0.00',
            discount_total: '0.00',
            shipping_total: '0.00',
            tax_total: '0.00',
            grand_total: '0.00',
            applied_discount_codes: [],
            applied_giftcard_codes: [],
            applied_discounts: [],
            items: [],
            itemCount: 0,
            totalQuantity: 0,
            hasStockIssues: false,
            hasPriceChanges: false,
            hasUnmergedGuestCart: false,
        } as CartResponse, 'Empty cart');
    }

    // Find active cart (exclude converted carts)
    let cart;
    let hasUnmergedGuestCart = false;

    if (userId) {
        [cart] = await db
            .select()
            .from(carts)
            .where(and(
                eq(carts.user_id, userId),
                eq(carts.cart_status, 'active'), // CRITICAL: Only get active carts
                eq(carts.is_deleted, false)
            ))
            .limit(1);

        // Check if there's an unmerged guest cart (for frontend to trigger merge if needed)
        // NOTE: We no longer auto-assign here to avoid side effects in GET requests
        if (sessionId) {
            const [guestCart] = await db
                .select({ id: carts.id })
                .from(carts)
                .where(and(
                    eq(carts.session_id, sessionId),
                    eq(carts.cart_status, 'active'),
                    eq(carts.is_deleted, false)
                ))
                .limit(1);

            if (guestCart) {
                hasUnmergedGuestCart = true;

                // If user has no cart, use the guest cart for display (read-only)
                // The frontend should trigger a merge to properly assign it
                if (!cart) {
                    [cart] = await db
                        .select()
                        .from(carts)
                        .where(eq(carts.id, guestCart.id))
                        .limit(1);
                }
            }
        }
    } else if (sessionId) {
        [cart] = await db
            .select()
            .from(carts)
            .where(and(
                eq(carts.session_id, sessionId),
                eq(carts.cart_status, 'active'), // CRITICAL: Only get active carts
                eq(carts.is_deleted, false)
            ))
            .limit(1);
    }

    if (!cart) {
        return ResponseFormatter.success(res, {
            id: null,
            currency: 'INR',
            subtotal: '0.00',
            discount_total: '0.00',
            shipping_total: '0.00',
            tax_total: '0.00',
            grand_total: '0.00',
            applied_discount_codes: [],
            applied_giftcard_codes: [],
            applied_discounts: [],
            items: [],
            itemCount: 0,
            totalQuantity: 0,
            hasStockIssues: false,
            hasPriceChanges: false,
            hasUnmergedGuestCart: false,
        } as CartResponse, 'No active cart found');
    }

    // Get cart items with current product data
    const items = await db
        .select({
            id: cartItems.id,
            product_id: cartItems.product_id,
            bundle_id: cartItems.bundle_id,
            quantity: cartItems.quantity,
            cost_price: cartItems.cost_price,
            final_price: cartItems.final_price,
            discount_amount: cartItems.discount_amount,
            line_subtotal: cartItems.line_subtotal,
            line_total: cartItems.line_total,
            product_name: cartItems.product_name,
            product_image_url: cartItems.product_image_url,
            product_sku: cartItems.product_sku,
            // Current product data
            current_price: products.selling_price,
            current_image: products.primary_image_url,
            product_status: products.status,
        })
        .from(cartItems)
        .leftJoin(products, eq(cartItems.product_id, products.id))
        .where(and(
            eq(cartItems.cart_id, cart.id),
            eq(cartItems.is_deleted, false)
        ));

    // Enrich items with stock information
    const enrichedItems: CartItemResponse[] = await Promise.all(
        items.map(async (item) => {
            let availableStock = 0;
            let inStock = true;

            if (item.product_id) {
                // Get stock for this product
                const [stockData] = await db
                    .select({
                        totalStock: sql<number>`SUM(${inventory.available_quantity} - ${inventory.reserved_quantity})`,
                    })
                    .from(inventory)
                    .where(eq(inventory.product_id, item.product_id));

                availableStock = Number(stockData?.totalStock) || 0;
                inStock = availableStock >= item.quantity;
            }

            const priceChanged = item.current_price !== null &&
                item.final_price !== item.current_price;

            return {
                id: item.id,
                product_id: item.product_id,
                bundle_id: item.bundle_id,
                quantity: item.quantity,
                cost_price: item.cost_price,
                final_price: item.final_price,
                discount_amount: item.discount_amount,
                line_subtotal: item.line_subtotal,
                line_total: item.line_total,
                product_name: item.product_name,
                product_image_url: item.current_image || item.product_image_url,
                product_sku: item.product_sku,
                inStock,
                availableStock,
                priceChanged,
                currentPrice: item.current_price,
            };
        })
    );

    const totalQuantity = enrichedItems.reduce((sum, item) => sum + item.quantity, 0);
    const hasStockIssues = enrichedItems.some(item => !item.inStock);
    const hasPriceChanges = enrichedItems.some(item => item.priceChanged);

    // Fetch discount metadata for applied codes
    const appliedCodes = (cart.applied_discount_codes as string[]) || [];
    let appliedDiscounts: AppliedDiscountInfo[] = [];

    if (appliedCodes.length > 0) {
        try {
            // Dynamically import to avoid circular dependencies
            const { discountCodes } = await import('../../discount/shared/discount-codes.schema');
            const { discounts } = await import('../../discount/shared/discount.schema');

            // Fetch discount info for each code
            const discountInfoResults = await db
                .select({
                    code: discountCodes.code,
                    type: discounts.type,
                    title: discounts.title,
                    value: discounts.value,
                })
                .from(discountCodes)
                .innerJoin(discounts, eq(discountCodes.discount_id, discounts.id))
                .where(sql`UPPER(${discountCodes.code}) IN (${sql.raw(appliedCodes.map(c => `'${c.toUpperCase()}'`).join(','))})`);

            appliedDiscounts = discountInfoResults.map(d => ({
                code: d.code,
                type: d.type as 'percentage' | 'fixed_amount' | 'free_shipping' | 'buy_x_get_y',
                title: d.title,
                value: d.value,
                savings: cart.discount_total, // Total savings for now
            }));
        } catch (error) {
            // Continue without discount metadata
        }
    }

    const response: CartResponse = {
        id: cart.id,
        currency: cart.currency,
        subtotal: cart.subtotal,
        discount_total: cart.discount_total,
        shipping_total: cart.shipping_total,
        tax_total: cart.tax_total,
        grand_total: cart.grand_total,
        applied_discount_codes: appliedCodes,
        applied_giftcard_codes: (cart.applied_giftcard_codes as string[]) || [],
        applied_discounts: appliedDiscounts,
        items: enrichedItems,
        itemCount: enrichedItems.length,
        totalQuantity,
        hasStockIssues,
        hasPriceChanges,
        hasUnmergedGuestCart,
    };

    return ResponseFormatter.success(res, response, 'Cart retrieved successfully');
};

import { optionalAuth } from '../../../middlewares';

const router = Router();
router.get('/', optionalAuth, handler);

export default router;
