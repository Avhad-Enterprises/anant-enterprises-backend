/**
 * PUT /api/admin/orders/:id/fulfillment
 * Update order fulfillment status
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { HttpException, ResponseFormatter, logger } from '../../../utils';
import { db } from '../../../database';
import { orders } from '../shared/orders.schema';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth, requirePermission } from '../../../middlewares';
import { fulfillOrderInventory } from '../../inventory/services/inventory.service';
import { eventPublisher } from '../../queue/services/event-publisher.service';
import { TEMPLATE_CODES } from '../../notifications/shared/constants';

const paramsSchema = z.object({
    id: z.string().uuid(),
});

const bodySchema = z.object({
    fulfillment_status: z.enum(['unfulfilled', 'fulfilled', 'returned', 'cancelled']),
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
        throw new HttpException(404, 'Order not found');
    }

    // Prepare update data
    const updateData: any = {
        fulfillment_status: data.fulfillment_status,
        updated_at: new Date(),
        updated_by: req.userId || null,
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

    // Trigger inventory adjustment if status changed to fulfilled
    if (data.fulfillment_status === 'fulfilled' && existingOrder.fulfillment_status !== 'fulfilled') {
        try {
            // Allow negative stock (Admin Override)
            await fulfillOrderInventory(id, req.userId!, true);
            logger.info(`Stock deducted for fulfilled order ${id}`);
        } catch (error) {
            logger.error(`Failed to deduct inventory for order ${id}:`, error);
            // We log but don't fail the request, as the order status update is primary
            // Ideally should perhaps alert admin
        }
    }

    // Send fulfillment notification to customer (non-blocking)
    if (updatedOrder.user_id && data.fulfillment_status !== existingOrder.fulfillment_status) {
        setImmediate(async () => {
            try {
                await eventPublisher.publishNotification({
                    userId: updatedOrder.user_id!,
                    templateCode: TEMPLATE_CODES.ORDER_FULFILLMENT_UPDATED,
                    variables: {
                        orderNumber: updatedOrder.order_number,
                        fulfillmentStatus: data.fulfillment_status,
                        trackingNumber: data.tracking_number || updatedOrder.order_tracking || 'Not available',
                        deliveryDate: data.delivery_date || 'Pending',
                    },
                    options: {
                        priority: 'normal',
                        actionUrl: `/profile/orders/${updatedOrder.id}`,
                        actionText: 'View Order',
                    },
                });
                logger.info(`[UpdateFulfillment] Fulfillment notification queued for order ${updatedOrder.order_number}`);
            } catch (error) {
                logger.error(`[UpdateFulfillment] Failed to queue fulfillment notification:`, error);
            }
        });
    }

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

