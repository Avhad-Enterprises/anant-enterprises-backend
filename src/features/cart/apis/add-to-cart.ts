/**
 * POST /api/cart/items
 * Add a product or bundle to the cart
 * - Authenticated users: cart linked to user_id
 * - Guest users: cart linked to session_id (from header)
 */

import { Router, Response, Request } from 'express';
import { z } from 'zod';
import { eq, and, sql } from 'drizzle-orm';
import { ResponseFormatter, decimalSchema } from '../../../utils';
import { HttpException } from '../../../utils';
import { db } from '../../../database';
import { carts } from '../shared/carts.schema';
import { cartItems } from '../shared/cart-items.schema';
import { products } from '../../product/shared/product.schema';
import { inventory } from '../../inventory/shared/inventory.schema';
import { RequestWithUser } from '../../../interfaces';

// Validation schema
const addToCartSchema = z.object({
    product_id: z.string().uuid().optional(),
    bundle_id: z.string().uuid().optional(),
    quantity: z.number().int().min(1).max(100).default(1),
    customization_data: z.array(z.object({
        option_id: z.string(),
        option_name: z.string(),
        selected_value: z.string(),
        price_adjustment: decimalSchema.default('0.00'),
    })).optional().default([]),
}).refine(
    data => data.product_id || data.bundle_id,
    { message: 'Either product_id or bundle_id is required' }
);

type AddToCartData = z.infer<typeof addToCartSchema>;

/**
 * Get or create cart for user/session
 */
async function getOrCreateCart(userId: string | null, sessionId: string | null): Promise<string> {
    if (!userId && !sessionId) {
        throw new HttpException(400, 'Either user authentication or session ID is required');
    }

    // Find existing active cart
    let existingCart;
    if (userId) {
        [existingCart] = await db
            .select({ id: carts.id })
            .from(carts)
            .where(and(
                eq(carts.user_id, userId),
                eq(carts.cart_status, 'active'),
                eq(carts.is_deleted, false)
            ))
            .limit(1);
    } else if (sessionId) {
        [existingCart] = await db
            .select({ id: carts.id })
            .from(carts)
            .where(and(
                eq(carts.session_id, sessionId),
                eq(carts.cart_status, 'active'),
                eq(carts.is_deleted, false)
            ))
            .limit(1);
    }

    if (existingCart) {
        return existingCart.id;
    }

    // Create new cart
    const [newCart] = await db.insert(carts).values({
        user_id: userId,
        session_id: sessionId,
        cart_status: 'active',
        source: 'web',
        created_by: userId,
    }).returning({ id: carts.id });

    if (!newCart) {
        throw new HttpException(500, 'Failed to create cart');
    }

    return newCart.id;
}

/**
 * Check stock availability for a product
 */
async function checkStockAvailability(productId: string, requestedQuantity: number): Promise<{ available: boolean; totalStock: number }> {
    const [stockData] = await db
        .select({
            totalStock: sql<number>`SUM(${inventory.available_quantity} - ${inventory.reserved_quantity})`,
        })
        .from(inventory)
        .where(eq(inventory.product_id, productId));

    const totalStock = Number(stockData?.totalStock) || 0;
    return {
        available: totalStock >= requestedQuantity,
        totalStock,
    };
}

/**
 * Recalculate cart totals
 */
async function recalculateCartTotals(cartId: string): Promise<void> {
    // Get all active cart items
    const items = await db
        .select({
            line_total: cartItems.line_total,
            line_subtotal: cartItems.line_subtotal,
            discount_amount: cartItems.discount_amount,
        })
        .from(cartItems)
        .where(and(
            eq(cartItems.cart_id, cartId),
            eq(cartItems.is_deleted, false)
        ));

    const subtotal = items.reduce((sum, item) => sum + Number(item.line_subtotal), 0);
    const discountTotal = items.reduce((sum, item) => sum + Number(item.discount_amount), 0);
    const grandTotal = items.reduce((sum, item) => sum + Number(item.line_total), 0);

    await db.update(carts)
        .set({
            subtotal: subtotal.toFixed(2),
            discount_total: discountTotal.toFixed(2),
            grand_total: grandTotal.toFixed(2),
            last_activity_at: new Date(),
            updated_at: new Date(),
        })
        .where(eq(carts.id, cartId));
}

const handler = async (req: Request, res: Response) => {
    const userReq = req as RequestWithUser;
    const userId = userReq.userId || null;
    const sessionId = req.headers['x-session-id'] as string || null;

    // Parse and validate request body
    const data = addToCartSchema.parse(req.body);

    // Get or create cart
    const cartId = await getOrCreateCart(userId, sessionId);

    // Validate product exists and is active
    if (data.product_id) {
        const [product] = await db
            .select({
                id: products.id,
                product_title: products.product_title,
                primary_image_url: products.primary_image_url,
                sku: products.sku,
                selling_price: products.selling_price,
                compare_at_price: products.compare_at_price,
                status: products.status,
            })
            .from(products)
            .where(and(
                eq(products.id, data.product_id),
                eq(products.is_deleted, false)
            ))
            .limit(1);

        if (!product) {
            throw new HttpException(404, 'Product not found');
        }

        if (product.status !== 'active') {
            throw new HttpException(400, 'Product is not available for purchase');
        }

        // Check stock availability
        const stockCheck = await checkStockAvailability(data.product_id, data.quantity);
        if (!stockCheck.available) {
            throw new HttpException(400, `Insufficient stock. Only ${stockCheck.totalStock} units available.`);
        }

        // Check if item already exists in cart
        const [existingItem] = await db
            .select({ id: cartItems.id, quantity: cartItems.quantity })
            .from(cartItems)
            .where(and(
                eq(cartItems.cart_id, cartId),
                eq(cartItems.product_id, data.product_id),
                eq(cartItems.is_deleted, false)
            ))
            .limit(1);

        const sellingPrice = Number(product.selling_price);
        const compareAtPrice = product.compare_at_price ? Number(product.compare_at_price) : sellingPrice;
        const discountAmount = Math.max(compareAtPrice - sellingPrice, 0);

        if (existingItem) {
            // Update quantity
            const newQuantity = existingItem.quantity + data.quantity;

            // Verify stock for new quantity
            const newStockCheck = await checkStockAvailability(data.product_id, newQuantity);
            if (!newStockCheck.available) {
                throw new HttpException(400, `Cannot add more items. Only ${newStockCheck.totalStock} units available.`);
            }

            const lineSubtotal = compareAtPrice * newQuantity;
            const lineTotal = sellingPrice * newQuantity;

            await db.update(cartItems)
                .set({
                    quantity: newQuantity,
                    line_subtotal: lineSubtotal.toFixed(2),
                    line_total: lineTotal.toFixed(2),
                    discount_amount: (discountAmount * newQuantity).toFixed(2),
                    updated_at: new Date(),
                })
                .where(eq(cartItems.id, existingItem.id));
        } else {
            // Create new cart item
            const lineSubtotal = compareAtPrice * data.quantity;
            const lineTotal = sellingPrice * data.quantity;

            await db.insert(cartItems).values({
                cart_id: cartId,
                product_id: data.product_id,
                quantity: data.quantity,
                cost_price: product.selling_price,
                final_price: product.selling_price,
                discount_amount: (discountAmount * data.quantity).toFixed(2),
                line_subtotal: lineSubtotal.toFixed(2),
                line_total: lineTotal.toFixed(2),
                product_name: product.product_title,
                product_image_url: product.primary_image_url,
                product_sku: product.sku,
                customization_data: data.customization_data,
            });
        }
    }

    // TODO: Handle bundle_id case similarly

    // Recalculate cart totals
    await recalculateCartTotals(cartId);

    // Fetch updated cart
    const [updatedCart] = await db
        .select()
        .from(carts)
        .where(eq(carts.id, cartId));

    const cartItemsList = await db
        .select()
        .from(cartItems)
        .where(and(
            eq(cartItems.cart_id, cartId),
            eq(cartItems.is_deleted, false)
        ));

    return ResponseFormatter.success(res, {
        cart: updatedCart,
        items: cartItemsList,
        itemCount: cartItemsList.length,
    }, 'Item added to cart successfully', 201);
};

const router = Router();
router.post('/items', handler);

export default router;
