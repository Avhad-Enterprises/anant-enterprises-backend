/**
 * POST /api/orders
 * Create a new order from the user's cart
 * - Validates cart items
 * - Creates order with order_items
 * - Marks cart as converted
 * - Updates wishlist items with purchased_at
 */

import { Router, Response } from 'express';
import { eq, and } from 'drizzle-orm';
import { ResponseFormatter, HttpException } from '../../../utils';
import { db } from '../../../database';
import { orders } from '../shared/orders.schema';
import { orderItems } from '../shared/order-items.schema';
import { carts } from '../../cart/shared/carts.schema';
import { cartItems } from '../../cart/shared/cart-items.schema';
import { wishlistItems } from '../../wishlist/shared/wishlist-items.schema';
import { wishlists } from '../../wishlist/shared/wishlist.schema';
import { users } from '../../user/shared/user.schema';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth } from '../../../middlewares';
import { validateStockAvailability, extendCartReservation, logOrderPlacement } from '../../inventory/services/inventory.service';
import { createOrderSchema, orderService, queueCustomerOrderNotification, queueAdminOrderNotification } from '../shared';

const handler = async (req: RequestWithUser, res: Response) => {
    const userId = req.userId;
    if (!userId) {
        throw new HttpException(401, 'Authentication required');
    }

    const body = createOrderSchema.parse(req.body);

    // Get session ID from header (for guest cart fallback)
    const sessionId = req.headers['x-session-id'] as string || null;

    // Find user's active cart
    let [cart] = await db
        .select()
        .from(carts)
        .where(and(
            eq(carts.user_id, userId),
            eq(carts.cart_status, 'active'),
            eq(carts.is_deleted, false)
        ))
        .limit(1);

    // FALLBACK: If no user cart found but session ID provided, check for unmerged guest cart
    // This handles the case where cart merge didn't complete during login
    if (!cart && sessionId) {
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
            // Auto-assign guest cart to user for this order
            await db.update(carts)
                .set({
                    user_id: userId,
                    updated_at: new Date(),
                })
                .where(eq(carts.id, guestCart.id));

            // Use the now-assigned cart
            cart = { ...guestCart, user_id: userId };
        }
    }

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

    // Calculate totals - Use Cart Totals which include order-level discounts
    const subtotal = Number(cart.subtotal);
    const discountTotal = Number(cart.discount_total);
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

    // For now, simplified tax and shipping (should come from cart if we had it there)
    const shippingAmount = 0; // Free shipping
    const taxAmount = 0; // Tax calculated separately if needed

    // Grand total should match cart's grand_total roughly, but let's recalculate to be safe with shipping/tax
    const totalAmount = Math.max(subtotal - discountTotal + shippingAmount + taxAmount, 0);

    // Resolve Discount Details if applied
    let discountId = null;
    let discountCodeId = null;
    let discountCode = null;

    // Check for applied discount codes
    const appliedCodes = (cart.applied_discount_codes as string[]) || [];
    if (appliedCodes.length > 0) {
        discountCode = appliedCodes[0]; // Take the first one

        // Lookup discount details
        const { discountCodes } = await import('../../discount/shared/discount-codes.schema');

        const [codeDetails] = await db
            .select({
                code: discountCodes.code,
                discount_id: discountCodes.discount_id
            })
            .from(discountCodes)
            .where(eq(discountCodes.code, discountCode))
            .limit(1);

        if (codeDetails) {
            discountCodeId = codeDetails.code;
            discountId = codeDetails.discount_id;
        }
    }

    // Extend cart item reservations to prevent timeout during checkout
    try {
        await extendCartReservation(cart.id, 60); // Extend to 1 hour
    } catch (error: any) {
        console.warn('[create-order-from-cart] Failed to extend cart reservations:', error);
        // Continue anyway - order creation will re-validate stock
    }

    // Validate stock availability
    // NOTE: Stock is already reserved when items were added to cart
    // We only need to validate that reservations still exist
    const stockItems = items
        .filter(item => item.product_id)
        .map(item => ({
            product_id: item.product_id!,
            quantity: item.quantity,
        }));

    if (stockItems.length > 0) {
        const validations = await validateStockAvailability(stockItems);
        const failures = validations.filter(v => !v.available);

        if (failures.length > 0) {
            const errorMessages = failures.map(f => f.message).join('; ');
            throw new HttpException(400, `Insufficient stock: ${errorMessages}`);
        }
    }

    // Create order
    const orderNumber = await orderService.generateOrderNumber();

    // Create order WITHOUT re-reserving stock (already reserved in cart)
    const order = await db.transaction(async (tx) => {
        // Create order
        const [newOrder] = await tx.insert(orders).values({
            order_number: orderNumber,
            user_id: userId,
            cart_id: cart.id,
            shipping_address_id: body.shipping_address_id || null,
            billing_address_id: body.billing_address_id || body.shipping_address_id || null,
            channel: 'web',
            order_status: 'pending',
            is_draft: false,
            payment_method: body.payment_method,
            payment_status: 'pending',
            currency: cart.currency,
            subtotal: subtotal.toFixed(2),
            discount_amount: discountTotal.toFixed(2),
            discount_id: discountId,
            discount_code_id: discountCodeId,
            discount_code: discountCode,
            shipping_amount: shippingAmount.toFixed(2),
            tax_amount: taxAmount.toFixed(2),
            total_amount: totalAmount.toFixed(2),
            total_quantity: totalQuantity,
            customer_note: body.customer_note,
            created_by: userId,
            updated_by: userId,
        }).returning();

        if (!newOrder) {
            throw new HttpException(500, 'Failed to create order');
        }

        // Create order items from cart items
        const orderItemsData = items.map(item => ({
            order_id: newOrder.id,
            product_id: item.product_id,
            sku: item.product_sku,
            product_name: item.product_name || 'Unknown Product',
            product_image: item.product_image_url,
            cost_price: item.final_price,
            quantity: item.quantity,
            line_total: item.line_total,
        }));

        await tx.insert(orderItems).values(orderItemsData);

        // Mark cart as converted ONLY if it's COD or direct confirmation
        // For Razorpay/Online, we keep it active until payment is verified
        if (body.payment_method !== 'razorpay') {
            await tx.update(carts)
                .set({
                    cart_status: 'converted',
                    updated_at: new Date(),
                })
                .where(eq(carts.id, cart.id));
        }

        return newOrder;
    });

    // Log order placement for inventory tracking
    await logOrderPlacement(order.id, order.order_number, userId);

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

    // Send response first, then queue notifications
    const response = ResponseFormatter.success(res, {
        order_id: order.id,
        order_number: order.order_number,
        order_status: order.order_status,
        payment_status: order.payment_status,
        total_amount: order.total_amount,
        discount_amount: order.discount_amount,
        total_quantity: order.total_quantity,
        items_count: items.length,
        created_at: order.created_at,
    }, 'Order created successfully', 201);

    // Queue notifications AFTER response is sent (non-blocking)
    setImmediate(async () => {
        // Customer notification
        await queueCustomerOrderNotification(
            userId!,
            order.id,
            order.order_number,
            order.total_amount,
            order.currency || 'INR'
        );

        // Admin notification
        const [customer] = await db
            .select({ name: users.first_name })
            .from(users)
            .where(eq(users.id, userId))
            .limit(1);

        await queueAdminOrderNotification(
            order.id,
            order.order_number,
            customer?.name || 'Customer',
            order.total_amount
        );
    });

    return response;
};

const router = Router();
router.post('/', requireAuth, handler);

export default router;
