/**
 * POST /api/admin/orders/drafts/:id/confirm
 * Convert a draft order to a confirmed order
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { HttpException, ResponseFormatter, logger } from '../../../utils';
import { db } from '../../../database';
import { orders } from '../shared/orders.schema';
import { orderItems } from '../shared/order-items.schema';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth, requirePermission } from '../../../middlewares';
import { reserveStockForOrder } from '../../inventory/services/inventory.service';
import { eventPublisher } from '../../queue/services/event-publisher.service';
import { TEMPLATE_CODES } from '../../notifications/shared/constants';

const paramsSchema = z.object({
    id: z.string().uuid(),
});

const bodySchema = z.object({
    send_confirmation_email: z.boolean().default(true),
    notes: z.string().optional(),
});

const handler = async (req: RequestWithUser, res: Response) => {
    const { id } = paramsSchema.parse(req.params);
    const data = bodySchema.parse(req.body);

    logger.info(`Converting draft order ${id} to confirmed order`);

    return await db.transaction(async (tx) => {
        // Get the draft order
        const [draftOrder] = await tx
            .select()
            .from(orders)
            .where(eq(orders.id, id));

        if (!draftOrder) {
            throw new HttpException(404, 'Draft order not found');
        }

        if (!draftOrder.is_draft) {
            throw new HttpException(400, 'Order is not a draft');
        }

        // Get order items to reserve inventory
        const items = await tx
            .select()
            .from(orderItems)
            .where(eq(orderItems.order_id, id));

        if (items.length === 0) {
            throw new HttpException(400, 'Cannot confirm order without items');
        }

        // Reserve inventory for each item
        const stockItems = items
            .filter(item => item.product_id !== null) // Skip items without product_id
            .map(item => ({
                product_id: item.product_id!,
                quantity: item.quantity,
            }));

        try {
            await reserveStockForOrder(
                stockItems,
                draftOrder.order_number,
                draftOrder.user_id || 'GUEST',
                false // allowOverselling = false for confirmed orders
            );
            logger.info(`[ConfirmDraft] Inventory reserved for order ${draftOrder.order_number}`);
        } catch (error: any) {
            logger.error(`[ConfirmDraft] Failed to reserve inventory:`, error);
            throw new HttpException(400, `Cannot confirm order: ${error.message || 'Insufficient stock'}`);
        }

        // Prepare update data
        const updateData: any = {
            is_draft: false,
            order_status: 'confirmed',
            updated_at: new Date(),
            updated_by: req.userId || null,
        };

        // Add confirmation note to admin comment
        if (data.notes) {
            const existingComment = draftOrder.admin_comment || '';
            const timestamp = new Date().toISOString();
            updateData.admin_comment = `${existingComment}\n[${timestamp}] Draft confirmed: ${data.notes}`.trim();
        }

        // Update the order
        const [confirmedOrder] = await tx
            .update(orders)
            .set(updateData)
            .where(eq(orders.id, id))
            .returning();

        logger.info(`Draft order ${id} converted to confirmed order ${confirmedOrder.order_number}`);

        // Send confirmation email if requested (non-blocking)
        let emailSent = false;
        if (data.send_confirmation_email && confirmedOrder.user_id) {
            setImmediate(async () => {
                try {
                    await eventPublisher.publishNotification({
                        userId: confirmedOrder.user_id!,
                        templateCode: TEMPLATE_CODES.ORDER_CONFIRMED,
                        variables: {
                            orderNumber: confirmedOrder.order_number,
                            totalAmount: confirmedOrder.total_amount,
                            currency: confirmedOrder.currency || 'INR',
                            orderStatus: confirmedOrder.order_status,
                        },
                        options: {
                            priority: 'high',
                            actionUrl: `/profile/orders/${confirmedOrder.id}`,
                            actionText: 'View Order',
                        },
                    });
                    logger.info(`[ConfirmDraft] Confirmation email queued for order ${confirmedOrder.order_number}`);
                } catch (error) {
                    logger.error(`[ConfirmDraft] Failed to queue confirmation email:`, error);
                }
            });
            emailSent = true;
        }

        return ResponseFormatter.success(
            res,
            {
                ...confirmedOrder,
                items,
                inventory_reserved: true,
                email_sent: emailSent,
            },
            'Draft order confirmed successfully',
            200
        );
    });
};

const router = Router();
router.post(
    '/admin/orders/drafts/:id/confirm',
    requireAuth,
    requirePermission('orders:update'),
    handler
);

export default router;

