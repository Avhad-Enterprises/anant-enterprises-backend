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
import { products } from '../../product/shared/product.schema';
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
    items: CartItemResponse[];
    itemCount: number;
    totalQuantity: number;
    hasStockIssues: boolean;
    hasPriceChanges: boolean;
}

const handler = async (req: Request, res: Response) => {
    const userReq = req as RequestWithUser;
    const userId = userReq.userId || null;
    const sessionId = req.headers['x-session-id'] as string || null;

    console.log('[GET /cart] Request - userId:', userId, 'sessionId:', sessionId);

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
            items: [],
            itemCount: 0,
            totalQuantity: 0,
            hasStockIssues: false,
            hasPriceChanges: false,
        } as CartResponse, 'Empty cart');
    }

    // Find active cart (exclude converted carts)
    let cart;
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
        console.log('[GET /cart] User cart lookup - found:', !!cart, 'status:', cart?.cart_status);

        // FALLBACK: If no user cart found but session ID provided, check for unmigrated guest cart
        // This handles the case where cart merge failed during login
        if (!cart && sessionId) {
            console.log('[GET /cart] No user cart found, checking for unmigrated guest cart with session:', sessionId);
            const [guestCart] = await db
                .select()
                .from(carts)
                .where(and(
                    eq(carts.session_id, sessionId),
                    eq(carts.cart_status, 'active'),
                    eq(carts.is_deleted, false)
                ))
                .limit(1);

            if (guestCart) {
                // Auto-assign guest cart to user (simple merge - just reassign ownership)
                console.log('[GET /cart] Found unmigrated guest cart, assigning to user:', guestCart.id);
                await db.update(carts)
                    .set({
                        user_id: userId,
                        session_id: null, // Clear session_id since it's now user-owned
                        updated_at: new Date(),
                    })
                    .where(eq(carts.id, guestCart.id));

                // Use the now-assigned cart
                cart = { ...guestCart, user_id: userId, session_id: null };
                console.log('[GET /cart] Successfully assigned guest cart to user');
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
        console.log('[GET /cart] Session cart lookup - found:', !!cart, 'status:', cart?.cart_status);
    }

    if (!cart) {
        console.log('[GET /cart] No active cart found');
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
            items: [],
            itemCount: 0,
            totalQuantity: 0,
            hasStockIssues: false,
            hasPriceChanges: false,
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

    const response: CartResponse = {
        id: cart.id,
        currency: cart.currency,
        subtotal: cart.subtotal,
        discount_total: cart.discount_total,
        shipping_total: cart.shipping_total,
        tax_total: cart.tax_total,
        grand_total: cart.grand_total,
        applied_discount_codes: (cart.applied_discount_codes as string[]) || [],
        applied_giftcard_codes: (cart.applied_giftcard_codes as string[]) || [],
        items: enrichedItems,
        itemCount: enrichedItems.length,
        totalQuantity,
        hasStockIssues,
        hasPriceChanges,
    };

    return ResponseFormatter.success(res, response, 'Cart retrieved successfully');
};

import { optionalAuth } from '../../../middlewares/auth.middleware';

const router = Router();
router.get('/', optionalAuth, handler);

export default router;
