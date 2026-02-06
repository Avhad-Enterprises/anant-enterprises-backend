/**
 * DELETE /api/admin/orders
 * Admin: Soft delete multiple orders
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { inArray, eq, and } from 'drizzle-orm';
import { HttpException, ResponseFormatter, logger } from '../../../utils';
import { db } from '../../../database';
import { orders } from '../shared/orders.schema';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth, requirePermission } from '../../../middlewares';

const bodySchema = z.object({
    order_ids: z.array(z.string().uuid()).min(1).max(100), // Max 100 orders at once
});

const paramsSchema = z.object({
    orderId: z.string().uuid(),
});

const bulkDeleteHandler = async (req: RequestWithUser, res: Response) => {
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
        throw new HttpException(500, 'Failed to delete orders');
    }
};

/**
 * DELETE /api/admin/orders/:orderId
 * Admin: Soft delete a single order with validation
 */
const singleDeleteHandler = async (req: RequestWithUser, res: Response) => {
    const { orderId } = paramsSchema.parse(req.params);

    try {
        // Get order details to validate before deletion
        const [order] = await db
            .select()
            .from(orders)
            .where(and(
                eq(orders.id, orderId),
                eq(orders.is_deleted, false)
            ));

        if (!order) {
            throw new HttpException(404, 'Order not found');
        }

        // Business rule validations
        // 1. Cannot delete paid orders
        if (order.payment_status === 'paid' ||
            order.payment_status === 'refunded' ||
            order.payment_status === 'partially_refunded') {
            throw new HttpException(400, 'Cannot delete paid orders');
        }

        // 2. Cannot delete delivered orders
        if (order.order_status === 'delivered') {
            throw new HttpException(400, 'Cannot delete delivered orders');
        }

        // 3. Cannot delete fulfilled orders
        if (order.fulfillment_status === 'fulfilled') {
            throw new HttpException(400, 'Cannot delete fulfilled orders');
        }

        // All validations passed - perform soft delete
        const [deletedOrder] = await db
            .update(orders)
            .set({
                is_deleted: true,
                deleted_at: new Date(),
                updated_by: req.userId,
            })
            .where(eq(orders.id, orderId))
            .returning({ id: orders.id, order_number: orders.order_number });

        logger.info('Order soft deleted', {
            orderId,
            orderNumber: deletedOrder.order_number,
            userId: req.userId,
        });

        return ResponseFormatter.success(res, {
            order_id: deletedOrder.id,
            order_number: deletedOrder.order_number,
        }, 'Order deleted successfully');
    } catch (error) {
        logger.error('Failed to delete order', {
            orderId,
            error: error instanceof Error ? error.message : String(error),
        });

        // Re-throw HttpException to preserve status code and message
        if (error instanceof HttpException) {
            throw error;
        }

        throw new HttpException(500, 'Failed to delete order');
    }
};

const router = Router();

// Single order delete (more specific route, must come first)
router.delete('/admin/orders/:orderId', requireAuth, requirePermission('orders:delete'), singleDeleteHandler);

// Bulk orders delete
router.delete('/admin/orders', requireAuth, requirePermission('orders:delete'), bulkDeleteHandler);

export default router;

