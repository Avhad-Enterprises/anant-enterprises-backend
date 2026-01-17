/**
 * PUT /api/admin/orders/:id/payment
 * Update order payment status
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
    payment_status: z.enum(['pending', 'authorized', 'partially_paid', 'paid', 'refunded', 'failed', 'partially_refunded']),
    paid_at: z.string().optional(), // ISO date string
    transaction_id: z.string().optional(),
    payment_ref: z.string().optional(),
    advance_paid_amount: z.string().optional(), // Decimal string for partially_paid
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
        return ResponseFormatter.error(res, 'ORDER_NOT_FOUND', 'Order not found', 404);
    }

    // Prepare update data
    const updateData: any = {
        payment_status: data.payment_status,
        updated_at: new Date(),
        updated_by: req.user?.id || null,
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

    // Handle partial payment
    if (data.payment_status === 'partially_paid' && data.advance_paid_amount) {
        updateData.advance_paid_amount = data.advance_paid_amount;

        // Calculate COD due amount
        const totalAmount = parseFloat(existingOrder.total_amount);
        const advancePaid = parseFloat(data.advance_paid_amount);
        updateData.cod_due_amount = (totalAmount - advancePaid).toFixed(2);
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

    // TODO: Send payment confirmation email if status is 'paid'
    // TODO: Update accounting/ledger systems

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
