/**
 * PUT /api/admin/orders/:id/fulfillment
 * Update order fulfillment status
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { ResponseFormatter, logger } from '../../../utils';
import { db } from '../../../database';
import { orders } from '../shared/orders.schema';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth, requirePermission } from '../../../middlewares';

const paramsSchema = z.object({
    id: z.string().uuid(),
});

const bodySchema = z.object({
    fulfillment_status: z.enum(['unfulfilled', 'partial', 'fulfilled', 'returned', 'cancelled']),
    fulfillment_date: z.string().optional(), // ISO date string
    delivery_date: z.string().optional(),
    tracking_number: z.string().optional(),
    notes: z.string().optional(),
});

const handler = async (req: RequestWithUser, res: Response) => {
    const { id } = paramsSchema.parse(req.params);
    const data = bodySchema.parse(req.body);

    logger.info(`Updating fulfillment status for order ${id}`, { data });

    // Check if order exists
    const [existingOrder] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, id));

    if (!existingOrder) {
        return ResponseFormatter.error(res, 'ORDER_NOT_FOUND', 'Order not found', 404);
    }

    // Prepare update data
    const updateData: any = {
        fulfillment_status: data.fulfillment_status,
        updated_at: new Date(),
        updated_by: req.user?.id || null,
    };

    // Set fulfillment_date if status is fulfilled
    if (data.fulfillment_status === 'fulfilled' && !existingOrder.fulfillment_date) {
        updateData.fulfillment_date = data.fulfillment_date ? new Date(data.fulfillment_date) : new Date();
    }

    // Set delivery_date if provided
    if (data.delivery_date) {
        updateData.delivery_date = new Date(data.delivery_date);
    }

    // Update tracking number if provided
    if (data.tracking_number) {
        updateData.order_tracking = data.tracking_number;
    }

    // Update admin comment if notes provided
    if (data.notes) {
        const existingComment = existingOrder.admin_comment || '';
        const timestamp = new Date().toISOString();
        updateData.admin_comment = `${existingComment}\n[${timestamp}] Fulfillment update: ${data.notes}`.trim();
    }

    // Update the order
    const [updatedOrder] = await db
        .update(orders)
        .set(updateData)
        .where(eq(orders.id, id))
        .returning();

    logger.info(`Fulfillment status updated for order ${id}`, {
        old_status: existingOrder.fulfillment_status,
        new_status: updatedOrder.fulfillment_status,
    });

    // TODO: Trigger inventory adjustment if status changed to fulfilled
    // TODO: Send notification/email to customer

    return ResponseFormatter.success(
        res,
        updatedOrder,
        'Fulfillment status updated successfully'
    );
};

const router = Router();
router.put(
    '/admin/orders/:id/fulfillment',
    requireAuth,
    requirePermission('orders:update'),
    handler
);

export default router;
