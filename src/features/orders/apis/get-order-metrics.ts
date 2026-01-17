/**
 * GET /api/admin/orders/metrics
 * Get order statistics and metrics for admin dashboard
 */

import { Router, Response } from 'express';
import { eq, and, or, count, sum, sql } from 'drizzle-orm';
import { ResponseFormatter, logger } from '../../../utils';
import { db } from '../../../database';
import { orders } from '../shared/orders.schema';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth, requirePermission } from '../../../middlewares';

const handler = async (req: RequestWithUser, res: Response) => {
    logger.info('GET /api/admin/orders/metrics');

    // Run all metric queries in parallel for performance
    const [
        totalOrdersResult,
        activeOrdersResult,
        fulfilledOrdersResult,
        cancelledOrdersResult,
        totalRevenueResult,
        pendingRevenueResult,
        paidRevenueResult,
    ] = await Promise.all([
        // Total orders (non-draft, non-deleted)
        db
            .select({ count: count() })
            .from(orders)
            .where(and(eq(orders.is_draft, false), eq(orders.is_deleted, false))),

        // Active orders (pending or partial fulfillment)
        db
            .select({ count: count() })
            .from(orders)
            .where(
                and(
                    eq(orders.is_draft, false),
                    eq(orders.is_deleted, false),
                    or(
                        eq(orders.fulfillment_status, 'unfulfilled'),
                        eq(orders.fulfillment_status, 'partial')
                    )
                )
            ),

        // Fulfilled orders
        db
            .select({ count: count() })
            .from(orders)
            .where(
                and(
                    eq(orders.is_draft, false),
                    eq(orders.is_deleted, false),
                    eq(orders.fulfillment_status, 'fulfilled')
                )
            ),

        // Cancelled orders
        db
            .select({ count: count() })
            .from(orders)
            .where(
                and(
                    eq(orders.is_draft, false),
                    eq(orders.is_deleted, false),
                    or(
                        eq(orders.order_status, 'cancelled'),
                        eq(orders.fulfillment_status, 'cancelled')
                    )
                )
            ),

        // Total revenue (all paid orders)
        db
            .select({
                total: sql<string>`COALESCE(SUM(CAST(${orders.total_amount} AS DECIMAL)), 0)`,
            })
            .from(orders)
            .where(
                and(
                    eq(orders.is_draft, false),
                    eq(orders.is_deleted, false),
                    eq(orders.payment_status, 'paid')
                )
            ),

        // Pending revenue (orders not paid yet)
        db
            .select({
                total: sql<string>`COALESCE(SUM(CAST(${orders.total_amount} AS DECIMAL)), 0)`,
            })
            .from(orders)
            .where(
                and(
                    eq(orders.is_draft, false),
                    eq(orders.is_deleted, false),
                    or(
                        eq(orders.payment_status, 'pending'),
                        eq(orders.payment_status, 'partially_paid')
                    )
                )
            ),

        // Paid orders revenue (same as total revenue for now)
        db
            .select({
                total: sql<string>`COALESCE(SUM(CAST(${orders.total_amount} AS DECIMAL)), 0)`,
                count: count(),
            })
            .from(orders)
            .where(
                and(
                    eq(orders.is_draft, false),
                    eq(orders.is_deleted, false),
                    eq(orders.payment_status, 'paid')
                )
            ),
    ]);

    const totalOrders = totalOrdersResult[0]?.count || 0;
    const paidOrdersCount = paidRevenueResult[0]?.count || 0;

    // Calculate average order value
    const totalRevenue = parseFloat(paidRevenueResult[0]?.total || '0');
    const avgOrderValue = paidOrdersCount > 0 ? totalRevenue / paidOrdersCount : 0;

    const metrics = {
        total_orders: totalOrders,
        active_orders: activeOrdersResult[0]?.count || 0,
        fulfilled_orders: fulfilledOrdersResult[0]?.count || 0,
        cancelled_orders: cancelledOrdersResult[0]?.count || 0,
        total_revenue: totalRevenueResult[0]?.total || '0.00',
        pending_revenue: pendingRevenueResult[0]?.total || '0.00',
        paid_revenue: paidRevenueResult[0]?.total || '0.00',
        avg_order_value: avgOrderValue.toFixed(2),
        fulfillment_rate:
            totalOrders > 0
                ? ((fulfilledOrdersResult[0]?.count || 0) / totalOrders * 100).toFixed(2)
                : '0.00',
    };

    logger.info('Order metrics calculated', { metrics });

    // TODO: Add caching layer (Redis) for better performance
    // Cache these metrics for 5-10 minutes since they don't change frequently

    return ResponseFormatter.success(res, metrics, 'Order metrics retrieved successfully');
};

const router = Router();
router.get('/admin/orders/metrics', requireAuth, requirePermission('orders:read'), handler);

export default router;
