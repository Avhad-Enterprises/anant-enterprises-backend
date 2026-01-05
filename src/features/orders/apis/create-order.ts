/**
 * POST /api/orders
 * Create a new order from the user's cart
 * - Validates cart items
 * - Creates order with order_items
 * - Marks cart as converted
 * - Updates wishlist items with purchased_at
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { ResponseFormatter } from '../../../utils';
import { HttpException } from '../../../utils';
import { db } from '../../../database';
import { orders } from '../shared/orders.schema';
import { orderItems } from '../shared/order-items.schema';
import { carts } from '../../cart/shared/carts.schema';
import { cartItems } from '../../cart/shared/cart-items.schema';
import { wishlistItems } from '../../wishlist/shared/wishlist-items.schema';
import { wishlists } from '../../wishlist/shared/wishlist.schema';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth } from '../../../middlewares';

// Request body schema
const createOrderSchema = z.object({
    shipping_address_id: z.string().uuid(),
    billing_address_id: z.string().uuid().optional(),
    payment_method: z.string().max(60).default('cod'),
    customer_note: z.string().max(500).optional(),
});

/**
 * Generate unique order number
 */
function generateOrderNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `ORD-${timestamp}-${random}`;
}

const handler = async (req: RequestWithUser, res: Response) => {
    const userId = req.userId;
    if (!userId) {
        throw new HttpException(401, 'Authentication required');
    }

    const body = createOrderSchema.parse(req.body);

    // Find user's active cart
    const [cart] = await db
        .select()
        .from(carts)
        .where(and(
            eq(carts.user_id, userId),
            eq(carts.cart_status, 'active'),
            eq(carts.is_deleted, false)
        ))
        .limit(1);

    if (!cart) {
        throw new HttpException(400, 'No active cart found');
    }

    // Get cart items
    const items = await db
        .select()
        .from(cartItems)
        .where(and(
            eq(cartItems.cart_id, cart.id),
            eq(cartItems.is_deleted, false)
        ));

    if (items.length === 0) {
        throw new HttpException(400, 'Cart is empty');
    }

    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + Number(item.line_subtotal), 0);
    const discountTotal = items.reduce((sum, item) => sum + Number(item.discount_amount), 0);
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

    // For now, simplified tax and shipping
    const shippingAmount = 0; // Free shipping
    const taxAmount = 0; // Tax calculated separately if needed
    const totalAmount = subtotal - discountTotal + shippingAmount + taxAmount;

    // Create order
    const orderNumber = generateOrderNumber();
    const [order] = await db.insert(orders).values({
        order_number: orderNumber,
        user_id: userId,
        cart_id: cart.id,
        shipping_address_id: body.shipping_address_id,
        billing_address_id: body.billing_address_id || body.shipping_address_id,
        channel: 'web',
        order_status: 'pending',
        is_draft: false,
        payment_method: body.payment_method,
        payment_status: 'pending',
        currency: cart.currency,
        subtotal: subtotal.toFixed(2),
        discount_amount: discountTotal.toFixed(2),
        shipping_amount: shippingAmount.toFixed(2),
        tax_amount: taxAmount.toFixed(2),
        total_amount: totalAmount.toFixed(2),
        total_quantity: totalQuantity,
        customer_note: body.customer_note,
        created_by: userId,
        updated_by: userId,
    }).returning();

    if (!order) {
        throw new HttpException(500, 'Failed to create order');
    }

    // Create order items from cart items
    const orderItemsData = items.map(item => ({
        order_id: order.id,
        product_id: item.product_id,
        sku: item.product_sku,
        product_name: item.product_name || 'Unknown Product',
        product_image: item.product_image_url,
        cost_price: item.final_price,
        quantity: item.quantity,
        line_total: item.line_total,
    }));

    await db.insert(orderItems).values(orderItemsData);

    // Mark cart as converted
    await db.update(carts)
        .set({
            cart_status: 'converted',
            updated_at: new Date(),
        })
        .where(eq(carts.id, cart.id));

    // Update wishlist items with purchased_at timestamp
    const [wishlist] = await db
        .select({ id: wishlists.id })
        .from(wishlists)
        .where(eq(wishlists.user_id, userId))
        .limit(1);

    if (wishlist) {
        const productIds = items
            .filter(item => item.product_id)
            .map(item => item.product_id!);

        for (const productId of productIds) {
            await db.update(wishlistItems)
                .set({
                    purchased_at: new Date(),
                    order_id: order.id,
                })
                .where(and(
                    eq(wishlistItems.wishlist_id, wishlist.id),
                    eq(wishlistItems.product_id, productId)
                ));
        }
    }

    // Return order summary
    return ResponseFormatter.success(res, {
        order_id: order.id,
        order_number: order.order_number,
        order_status: order.order_status,
        payment_status: order.payment_status,
        total_amount: order.total_amount,
        total_quantity: order.total_quantity,
        items_count: items.length,
        created_at: order.created_at,
    }, 'Order created successfully', 201);
};

const router = Router();
router.post('/', requireAuth, handler);

export default router;
