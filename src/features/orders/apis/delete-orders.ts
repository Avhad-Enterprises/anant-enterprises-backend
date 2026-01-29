/**
 * DELETE /api/admin/orders
 * Admin: Soft delete multiple orders
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { inArray } from 'drizzle-orm';
import { ResponseFormatter } from '../../../utils';
import { db } from '../../../database';
import { orders } from '../shared/orders.schema';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth, requirePermission } from '../../../middlewares';
import { logger } from '../../../utils';

const bodySchema = z.object({
    order_ids: z.array(z.string().uuid()).min(1).max(100), // Max 100 orders at once
});

const handler = async (req: RequestWithUser, res: Response) => {
    const { order_ids } = bodySchema.parse(req.body);

    try {
        // Soft delete orders
        const result = await db
            .update(orders)
            .set({
                is_deleted: true,
                deleted_at: new Date(),
                updated_by: req.userId,
            })
            .where(inArray(orders.id, order_ids))
            .returning({ id: orders.id });

        const deletedCount = result.length;

        logger.info('Orders soft deleted', {
            deletedCount,
            orderIds: order_ids,
            userId: req.userId,
        });

        return ResponseFormatter.success(res, {
            deleted_count: deletedCount,
            order_ids: result.map(r => r.id),
        }, `Successfully deleted ${deletedCount} order(s)`);
    } catch (error) {
        logger.error('Failed to delete orders', {
            orderIds: order_ids,
            error: error instanceof Error ? error.message : String(error),
        });
        return ResponseFormatter.error(res, 'DELETE_FAILED', 'Failed to delete orders', 500);
    }
};

const router = Router();
router.delete('/admin/orders', requireAuth, requirePermission('orders:delete'), handler);

export default router;
