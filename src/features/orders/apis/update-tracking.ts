/**
 * PUT /api/admin/orders/:id/tracking
 * Add or update tracking information for an order
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
    tracking_number: z.string().min(1, 'Tracking number is required'),
    shipping_method: z.string().optional(),
    shipping_option: z.string().optional(),
    carrier: z.string().optional(), // e.g., 'BlueDart', 'Delhivery'
    notes: z.string().optional(),
});

const handler = async (req: RequestWithUser, res: Response) => {
    const { id } = paramsSchema.parse(req.params);
    const data = bodySchema.parse(req.body);

    logger.info(`Adding tracking info for order ${id}`, { tracking_number: data.tracking_number });

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
        order_tracking: data.tracking_number,
        updated_at: new Date(),
        updated_by: req.user?.id || null,
    };

    if (data.shipping_method) {
        updateData.shipping_method = data.shipping_method;
    }

    if (data.shipping_option) {
        updateData.shipping_option = data.shipping_option;
    }

    // Update admin comment with carrier info if provided
    if (data.carrier || data.notes) {
        const existingComment = existingOrder.admin_comment || '';
        const timestamp = new Date().toISOString();
        let noteText = 'Tracking info added';

        if (data.carrier) {
            noteText += ` - Carrier: ${data.carrier}`;
        }

        if (data.notes) {
            noteText += ` - ${data.notes}`;
        }

        updateData.admin_comment = `${existingComment}\n[${timestamp}] ${noteText}`.trim();
    }

    // Update the order
    const [updatedOrder] = await db
        .update(orders)
        .set(updateData)
        .where(eq(orders.id, id))
        .returning();

    logger.info(`Tracking info updated for order ${id}`);

    // TODO: Send tracking email to customer
    // TODO: Integrate with carrier API for real-time tracking

    return ResponseFormatter.success(
        res,
        {
            id: updatedOrder.id,
            order_number: updatedOrder.order_number,
            tracking_number: updatedOrder.order_tracking,
            shipping_method: updatedOrder.shipping_method,
            shipping_option: updatedOrder.shipping_option,
            updated_at: updatedOrder.updated_at,
        },
        'Tracking information updated successfully'
    );
};

const router = Router();
router.put(
    '/admin/orders/:id/tracking',
    requireAuth,
    requirePermission('orders:update'),
    handler
);

export default router;
