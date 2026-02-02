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

        // TODO: Reserve inventory for each item
        // This should call the inventory service to reserve stock
        // For now, we'll add a comment noting this needs to be done

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

        // TODO: If send_confirmation_email is true, queue confirmation email
        // TODO: Integrate with inventory service to reserve stock
        // TODO: Create order timeline entry

        return ResponseFormatter.success(
            res,
            {
                ...confirmedOrder,
                items,
                inventory_reserved: false, // TODO: Set to true once inventory integration is done
                email_sent: false, // TODO: Set based on actual email sending
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
