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
import { logger, ResponseFormatter } from '../../../utils';
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
import { reserveStockForOrder, validateStockAvailability, extendCartReservation } from '../../inventory/services/inventory.service';

import { eventPublisher } from '../../queue/services/event-publisher.service';
import { getAllAdminUserIds } from '../../rbac/shared/queries';
import { TEMPLATE_CODES } from '../../notifications/shared/constants';
import { users } from '../../user/shared/user.schema';

// Get base URLs from environment
const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '');
const ADMIN_URL = (process.env.ADMIN_URL || 'http://localhost:5173').replace(/\/+$/, '');

// Request body schema
// Request body schema
const orderItemSchema = z.object({
    product_id: z.string().uuid(),
    quantity: z.number().min(1),
    cost_price: z.union([z.string(), z.number()]),
    line_total: z.union([z.string(), z.number()]),
    product_name: z.string().optional(),
    sku: z.string().optional(),
    product_image: z.string().optional(),
});

const createOrderSchema = z.object({
    // Common fields
    shipping_address_id: z.string().optional().or(z.literal('')), // Admin sends empty string if not selected
    billing_address_id: z.string().optional().or(z.literal('')),
    payment_method: z.string().max(60).default('cod'),
    customer_note: z.string().max(500).optional(),

    // Admin / Direct Order fields
    items: z.array(orderItemSchema).optional(),
    user_id: z.string().optional().or(z.literal('')), // Target customer ID
    channel: z.enum(['web', 'app', 'pos', 'marketplace', 'other']).optional(),
    is_draft: z.boolean().optional(),
    currency: z.string().optional(),

    // Pricing (Admin provided)
    subtotal: z.string().optional(),
    discount_total: z.string().optional(),
    tax_type: z.enum(['cgst_sgst', 'igst', 'none']).optional(),
    cgst_amount: z.string().optional(),
    sgst_amount: z.string().optional(),
    igst_amount: z.string().optional(),
    shipping_total: z.string().optional(),
    cod_charges: z.string().optional(),
    giftcard_total: z.string().optional(),
    total_amount: z.string().optional(),
    advance_paid_amount: z.string().optional(), // For partial payment

    // Metadata
    admin_comment: z.string().optional(),
    tags: z.array(z.string()).optional(),
    amz_order_id: z.string().optional(),
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

    // ==========================================
    // MODE 1: DIRECT ORDER (Admin/Direct Creation)
    // ==========================================
    if (body.items && body.items.length > 0) {
        // This is a direct order creation (e.g. from Admin Panel)
        // We trust the pricing and items sent in the body

        const targetUserId = body.user_id || null; // Customer ID (nullable)
        const creatorId = req.userId; // Admin/Staff ID

        // validate inputs
        if (!targetUserId && !body.user_id) {
            // It's allowed to have no user_id (Guest/Walk-in), but usually we want one. 
            // Proceeding with null user_id.
        }

        // 1. Validate Stock
        const stockItems = body.items.map(item => ({
            product_id: item.product_id,
            quantity: item.quantity,
        }));

        if (stockItems.length > 0) {
            const validations = await validateStockAvailability(stockItems);
            const failures = validations.filter(v => !v.available);

            if (failures.length > 0) {
                const errorMessages = failures.map(f => f.message).join('; ');
                // For Admin/Direct orders, we WARN but Allow proceeding (Overselling)
                logger.warn(`[create-order] Admin creating order with insufficient stock: ${errorMessages}`);
                // throw new HttpException(400, `Insufficient stock: ${errorMessages}`); 
            }
        }

        const orderNumber = generateOrderNumber();

        // 2. Create Order & Items
        const order = await db.transaction(async (tx) => {
            // Reserve stock (Allow Overselling = true for Admin)
            await reserveStockForOrder(stockItems, orderNumber, targetUserId || 'GUEST', true);

            // Insert Order
            const [newOrder] = await tx.insert(orders).values({
                order_number: orderNumber,
                user_id: targetUserId, // nullable
                shipping_address_id: body.shipping_address_id || null, // nullable
                billing_address_id: body.billing_address_id || body.shipping_address_id || null,
                channel: body.channel || 'web',
                order_status: body.is_draft ? 'pending' : 'pending', // Drafts are pending payment usually? Or 'draft'? Schema has is_draft flag.
                is_draft: body.is_draft || false,
                payment_method: body.payment_method,
                payment_status: 'pending', // Default
                currency: body.currency || 'INR',

                // Pricing
                subtotal: body.subtotal || '0',
                discount_amount: body.discount_total || '0',
                // tax_type: body.tax_type, // Not in main order columns? Logic says tax_amount, cgst, sgst, igst
                cgst: body.cgst_amount || '0',
                sgst: body.sgst_amount || '0',
                igst: body.igst_amount || '0',
                shipping_amount: body.shipping_total || '0',
                partial_cod_charges: body.cod_charges || '0', // Map cod_charges to partial_cod_charges or delivery_price??
                // checking schema... partial_cod_charges is correct? or delivery_price?
                // Mapper sends: cod_charges -> body.cod_charges
                // Schema has: partial_cod_charges AND cod_due_amount. Use partial_cod_charges for the charge itself.

                giftcard_amount: body.giftcard_total || '0',
                total_amount: body.total_amount || '0',
                advance_paid_amount: body.advance_paid_amount || '0',

                total_quantity: body.items!.reduce((sum, item) => sum + item.quantity, 0),

                customer_note: body.customer_note,
                admin_comment: body.admin_comment,
                amz_order_id: body.amz_order_id,
                tags: body.tags,

                created_by: creatorId,
                updated_by: creatorId,
            }).returning();

            if (!newOrder) {
                throw new HttpException(500, 'Failed to create order');
            }

            // Insert Items
            const orderItemsData = body.items!.map(item => ({
                order_id: newOrder.id,
                product_id: item.product_id,
                sku: item.sku || 'UNKNOWN',
                product_name: item.product_name || 'Unknown Product',
                product_image: item.product_image,
                cost_price: item.cost_price.toString(),
                quantity: item.quantity,
                line_total: item.line_total.toString(),
            }));

            await tx.insert(orderItems).values(orderItemsData);

            return newOrder;
        });

        // Send response first, then queue notifications
        const response = ResponseFormatter.success(res, {
            order_id: order.id,
            order_number: order.order_number,
            order_status: order.order_status,
            payment_status: order.payment_status,
            total_amount: order.total_amount,
            created_at: order.created_at,
        }, 'Order created successfully', 201);

        // Queue notifications AFTER response is sent (non-blocking)
        setImmediate(async () => {
            // 1. Notify customer if order is for a specific user
            if (targetUserId) {
                try {
                    // Fetch customer details for notification
                    const [customer] = await db
                        .select({ name: users.name, email: users.email })
                        .from(users)
                        .where(eq(users.id, targetUserId))
                        .limit(1);

                    await eventPublisher.publishNotification({
                        userId: targetUserId,
                        templateCode: TEMPLATE_CODES.ORDER_CREATED,
                        variables: {
                            userName: customer?.name || 'Customer',
                            orderNumber: order.order_number,
                            total: Number(order.total_amount).toFixed(2),
                            currency: order.currency || 'INR',
                            orderUrl: `${FRONTEND_URL}/profile/orders/${order.id}`,
                        },
                        options: {
                            priority: 'high',
                            actionUrl: `/profile/orders/${order.id}`,
                            actionText: 'View Order',
                        },
                    });
                } catch (error) {
                    logger.error('Failed to queue customer notification for direct order:', error);
                }
            }

            // 2. Notify all admins about new order
            try {
                logger.info('[Direct Order] Fetching admin user IDs for notification...');
                const adminUserIds = await getAllAdminUserIds();
                logger.info('[Direct Order] Admin user IDs:', { count: adminUserIds.length, ids: adminUserIds });
                
                if (adminUserIds.length > 0) {
                    // Fetch customer details for admin notification
                    let customerName = 'Guest';
                    let customerEmail = 'N/A';
                    if (targetUserId) {
                        const [customer] = await db
                            .select({ name: users.name, email: users.email })
                            .from(users)
                            .where(eq(users.id, targetUserId))
                            .limit(1);
                        customerName = customer?.name || 'Guest';
                        customerEmail = customer?.email || 'N/A';
                    }

                    logger.info('[Direct Order] Publishing batch notification to admins...', {
                        adminCount: adminUserIds.length,
                        templateCode: TEMPLATE_CODES.NEW_ORDER_RECEIVED,
                        orderNumber: order.order_number,
                    });

                    await eventPublisher.publishBatchNotification({
                        userIds: adminUserIds,
                        templateCode: TEMPLATE_CODES.NEW_ORDER_RECEIVED,
                        variables: {
                            orderNumber: order.order_number,
                            customerName,
                            customerEmail,
                            total: Number(order.total_amount).toFixed(2),
                            currency: order.currency || 'INR',
                            itemCount: body.items!.length,
                            orderUrl: `${ADMIN_URL}/orders/${order.order_number}`,
                        },
                        options: {
                            priority: 'high',
                            actionUrl: `/orders/${order.order_number}`,
                            actionText: 'View Order',
                        },
                    });
                    
                    logger.info('[Direct Order] Admin notification batch published successfully');
                } else {
                    logger.warn('[Direct Order] No admin users found - skipping admin notification');
                }
            } catch (error) {
                logger.error('Failed to queue admin notification for direct order:', error);
            }
        });

        return response;
    }

    // ==========================================
    // MODE 2: CART ORDER (Storefront/User Checkout)
    // ==========================================

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
        console.log('[create-order] No user cart found, checking for guest cart with session:', sessionId);
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
            console.log('[create-order] Found unmerged guest cart, assigning to user:', guestCart.id);
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

    // Calculate totals
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
        // We need discount_id and discount_code_id (code string itself?)
        // The schema says `discount_code_id` references `discountCodes.code`.
        // `discount_id` references `discounts.id`.

        // Dynamic import to avoid circular dep if any, or just import schemas
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

    // PHASE 2: Extend cart item reservations to prevent timeout during checkout
    try {
        await extendCartReservation(cart.id, 60); // Extend to 1 hour
        console.log('[create-order] Extended cart reservations for checkout:', cart.id);
    } catch (error: any) {
        console.warn('[create-order] Failed to extend cart reservations:', error);
        // Continue anyway - order creation will re-validate stock
    }

    // STEP 1: Validate stock availability
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
    const orderNumber = generateOrderNumber();

    // STEP 2: Create order and reserve stock in transaction
    const order = await db.transaction(async (tx) => {
        // Reserve stock first
        if (stockItems.length > 0) {
            await reserveStockForOrder(stockItems, orderNumber, userId);
        }

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
        // Send ORDER_CONFIRMED notification to customer via queue
        try {
            // Fetch customer details for personalized notification
            const [customer] = await db
                .select({ name: users.name, email: users.email })
                .from(users)
                .where(eq(users.id, userId))
                .limit(1);

            await eventPublisher.publishNotification({
                userId: userId!,
                templateCode: TEMPLATE_CODES.ORDER_CREATED,
                variables: {
                    userName: customer?.name || 'Customer',
                    orderNumber: order.order_number,
                    total: Number(order.total_amount).toFixed(2),
                    currency: order.currency || 'INR',
                    orderUrl: `${FRONTEND_URL}/profile/orders/${order.id}`,
                },
                options: {
                    priority: 'high',
                    actionUrl: `/profile/orders/${order.id}`,
                    actionText: 'View Order',
                },
            });
        } catch (error) {
            // Log but don't fail the order if notification fails
            logger.error('Failed to queue customer order notification:', error);
        }

        // Send NEW_ORDER_RECEIVED notification to all admins via queue
        try {
            logger.info('[Cart Order] Fetching admin user IDs for notification...');
            const adminUserIds = await getAllAdminUserIds();
            logger.info('[Cart Order] Admin user IDs:', { count: adminUserIds.length, ids: adminUserIds });
            
            if (adminUserIds.length > 0) {
                // Fetch customer details for admin notification
                const [customer] = await db
                    .select({ name: users.name, email: users.email })
                    .from(users)
                    .where(eq(users.id, userId))
                    .limit(1);

                logger.info('[Cart Order] Publishing batch notification to admins...', {
                    adminCount: adminUserIds.length,
                    templateCode: TEMPLATE_CODES.NEW_ORDER_RECEIVED,
                    orderNumber: order.order_number,
                });

                await eventPublisher.publishBatchNotification({
                    userIds: adminUserIds,
                    templateCode: TEMPLATE_CODES.NEW_ORDER_RECEIVED,
                    variables: {
                        orderNumber: order.order_number,
                        customerName: customer?.name || 'Customer',
                        customerEmail: customer?.email || 'N/A',
                        total: Number(order.total_amount).toFixed(2),
                        currency: order.currency || 'INR',
                        itemCount: items.length,
                        orderUrl: `${ADMIN_URL}/orders/${order.order_number}`,
                    },
                    options: {
                        priority: 'high',
                        actionUrl: `/orders/${order.order_number}`,
                        actionText: 'View Order',
                    },
                });
                
                logger.info('[Cart Order] Admin notification batch published successfully');
            } else {
                logger.warn('[Cart Order] No admin users found - skipping admin notification');
            }
        } catch (error) {
            logger.error('Failed to queue admin order notification:', error);
        }
    });

    return response;
};

const router = Router();
router.post('/', requireAuth, handler);

export default router;
