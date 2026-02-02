/**
 * POST /api/admin/orders/direct
 * Admin: Create a direct order with custom items
 * - Allows admin to create orders manually
 * - Accepts pre-calculated pricing from admin
 * - Allows overselling (warns but doesn't block)
 * - Reserves stock for the order
 */

import { Router, Response } from 'express';
import { ResponseFormatter, HttpException } from '../../../utils';
import { db } from '../../../database';
import { orders } from '../shared/orders.schema';
import { orderItems } from '../shared/order-items.schema';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth, requirePermission } from '../../../middlewares';
import { reserveStockForOrder, logOrderPlacement } from '../../inventory/services/inventory.service';
import { createOrderSchema, orderService, validateAndWarnStock, mapOrderItems, queueCustomerOrderNotification, queueAdminOrderNotification } from '../shared';
import { users } from '../../user/shared/user.schema';
import { eq } from 'drizzle-orm';

const handler = async (req: RequestWithUser, res: Response) => {
    const userId = req.userId;
    if (!userId) {
        throw new HttpException(401, 'Authentication required');
    }

    const body = createOrderSchema.parse(req.body);

    // Direct orders MUST have items
    if (!body.items || body.items.length === 0) {
        throw new HttpException(400, 'Direct order must include items');
    }

    const targetUserId = body.user_id || null; // Customer ID (nullable for guest orders)
    const creatorId = req.userId!; // Admin/Staff ID

    // 1. Validate Stock (warn but allow overselling for admin)
    const stockItems = body.items.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
    }));

    await validateAndWarnStock(stockItems, true); // allowOverselling = true

    const orderNumber = await orderService.generateOrderNumber();

    // 2. Create Order & Items
    const order = await db.transaction(async (tx) => {
        // Reserve stock (Allow Overselling = true for Admin)
        // NOTE: Direct/Admin orders MUST reserve here since they don't go through cart
        await reserveStockForOrder(stockItems, orderNumber, targetUserId || 'GUEST', true);

        // Insert Order
        const [newOrder] = await tx.insert(orders).values({
            order_number: orderNumber,
            user_id: targetUserId, // nullable
            shipping_address_id: body.shipping_address_id || null,
            billing_address_id: body.billing_address_id || body.shipping_address_id || null,
            channel: body.channel || 'web',
            order_status: body.is_draft ? 'pending' : 'pending',
            is_draft: body.is_draft || false,
            payment_method: body.payment_method,
            payment_status: 'pending',
            currency: body.currency || 'INR',

            // Pricing (admin provides these)
            subtotal: body.subtotal || '0',
            discount_amount: body.discount_total || '0',
            cgst: body.cgst_amount || '0',
            sgst: body.sgst_amount || '0',
            igst: body.igst_amount || '0',
            shipping_amount: body.shipping_total || '0',
            partial_cod_charges: body.cod_charges || '0',
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

        // Insert Items using helper
        const orderItemsData = mapOrderItems(newOrder.id, body.items!);
        await tx.insert(orderItems).values(orderItemsData);

        return newOrder;
    });

    // Log order placement for inventory tracking
    await logOrderPlacement(order.id, order.order_number, creatorId);

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
            await queueCustomerOrderNotification(
                targetUserId,
                order.id,
                order.order_number,
                order.total_amount,
                order.currency || 'INR'
            );
        }

        // 2. Notify all admins about new order
        let customerName = 'Guest';
        if (targetUserId) {
            const [customer] = await db
                .select({ name: users.first_name })
                .from(users)
                .where(eq(users.id, targetUserId))
                .limit(1);
            customerName = customer?.name || 'Guest';
        }

        await queueAdminOrderNotification(
            order.id,
            order.order_number,
            customerName,
            order.total_amount
        );
    });

    return response;
};

const router = Router();
router.post('/direct', requireAuth, requirePermission('orders:create'), handler);

export default router;
