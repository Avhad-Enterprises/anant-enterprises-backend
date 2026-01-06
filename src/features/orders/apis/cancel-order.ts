/**
 * POST /api/orders/:id/cancel
 * Cancel an order (user can only cancel pending/confirmed orders)
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { ResponseFormatter } from '../../../utils';
import { HttpException } from '../../../utils';
import { db } from '../../../database';
import { orders } from '../shared/orders.schema';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth } from '../../../middlewares';

const cancelSchema = z.object({
    reason: z.string().max(500).optional(),
});

const handler = async (req: RequestWithUser, res: Response) => {
    const userId = req.userId;
    const orderId = req.params.id;

    if (!userId) {
        throw new HttpException(401, 'Authentication required');
    }

    const { reason } = cancelSchema.parse(req.body || {});

    // Get order
    const [order] = await db
        .select()
        .from(orders)
        .where(and(
            eq(orders.id, orderId),
            eq(orders.is_deleted, false)
        ))
        .limit(1);

    if (!order) {
        throw new HttpException(404, 'Order not found');
    }

    // Verify ownership
    if (order.user_id !== userId) {
        throw new HttpException(403, 'Not authorized to cancel this order');
    }

    // Check if order can be cancelled
    const cancellableStatuses = ['pending', 'confirmed'];
    if (!cancellableStatuses.includes(order.order_status)) {
        throw new HttpException(400, `Cannot cancel order in "${order.order_status}" status. Only pending or confirmed orders can be cancelled.`);
    }

    // Update order status
    await db.update(orders)
        .set({
            order_status: 'cancelled',
            fulfillment_status: 'cancelled',
            admin_comment: reason ? `Cancelled by customer: ${reason}` : 'Cancelled by customer',
            updated_at: new Date(),
            updated_by: userId,
        })
        .where(eq(orders.id, orderId));

    // TODO: Restore inventory if reservation was made
    // TODO: Trigger refund if payment was made

    return ResponseFormatter.success(res, {
        order_id: orderId,
        order_number: order.order_number,
        new_status: 'cancelled',
    }, 'Order cancelled successfully');
};

const router = Router();
router.post('/:id/cancel', requireAuth, handler);

export default router;
