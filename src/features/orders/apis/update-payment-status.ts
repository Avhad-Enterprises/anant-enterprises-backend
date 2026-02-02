/**
 * PUT /api/admin/orders/:id/payment
 * Update order payment status
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { HttpException, ResponseFormatter, logger } from '../../../utils';
import { db } from '../../../database';
import { orders } from '../shared/orders.schema';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth, requirePermission } from '../../../middlewares';
import { eventPublisher } from '../../queue/services/event-publisher.service';
import { TEMPLATE_CODES } from '../../notifications/shared/constants';

const paramsSchema = z.object({
    id: z.string().uuid(),
});

const bodySchema = z.object({
    payment_status: z.enum(['pending', 'paid', 'refunded', 'failed', 'partially_refunded']),
    paid_at: z.string().optional(), // ISO date string
    transaction_id: z.string().optional(),
    payment_ref: z.string().optional(),
    notes: z.string().optional(),
});

const handler = async (req: RequestWithUser, res: Response) => {
    const { id } = paramsSchema.parse(req.params);
    const data = bodySchema.parse(req.body);

    logger.info(`Updating payment status for order ${id}`, { data });

    // Check if order exists
    const [existingOrder] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, id));

    if (!existingOrder) {
        throw new HttpException(404, 'Order not found');
    }

    // Prepare update data
    const updateData: any = {
        payment_status: data.payment_status,
        updated_at: new Date(),
        updated_by: req.userId || null,
    };

    // Set paid_at timestamp if status is paid and not already set
    if (data.payment_status === 'paid' && !existingOrder.paid_at) {
        updateData.paid_at = data.paid_at ? new Date(data.paid_at) : new Date();
    }

    // Update transaction details if provided
    if (data.transaction_id) {
        updateData.transaction_id = data.transaction_id;
    }

    if (data.payment_ref) {
        updateData.payment_ref = data.payment_ref;
    }

    // Update admin comment if notes provided
    if (data.notes) {
        const existingComment = existingOrder.admin_comment || '';
        const timestamp = new Date().toISOString();
        updateData.admin_comment = `${existingComment}\n[${timestamp}] Payment update: ${data.notes}`.trim();
    }

    // Update the order
    const [updatedOrder] = await db
        .update(orders)
        .set(updateData)
        .where(eq(orders.id, id))
        .returning();

    logger.info(`Payment status updated for order ${id}`, {
        old_status: existingOrder.payment_status,
        new_status: updatedOrder.payment_status,
    });

    // Send payment confirmation notification if status is 'paid' (non-blocking)
    if (data.payment_status === 'paid' && updatedOrder.user_id) {
        setImmediate(async () => {
            try {
                await eventPublisher.publishNotification({
                    userId: updatedOrder.user_id!,
                    templateCode: TEMPLATE_CODES.ORDER_PAYMENT_CONFIRMED,
                    variables: {
                        orderNumber: updatedOrder.order_number,
                        totalAmount: updatedOrder.total_amount,
                        currency: updatedOrder.currency || 'INR',
                        paymentMethod: updatedOrder.payment_method || 'Not specified',
                        transactionId: data.transaction_id || 'N/A',
                    },
                    options: {
                        priority: 'high',
                        actionUrl: `/profile/orders/${updatedOrder.id}`,
                        actionText: 'View Order',
                    },
                });
                logger.info(`[UpdatePayment] Payment confirmation notification queued for order ${updatedOrder.order_number}`);
            } catch (error) {
                logger.error(`[UpdatePayment] Failed to queue payment notification:`, error);
            }
        });
    }

    return ResponseFormatter.success(
        res,
        updatedOrder,
        'Payment status updated successfully'
    );
};

const router = Router();
router.put(
    '/admin/orders/:id/payment',
    requireAuth,
    requirePermission('orders:update'),
    handler
);

export default router;

