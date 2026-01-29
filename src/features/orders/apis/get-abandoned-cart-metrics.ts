/**
 * GET /api/admin/abandoned-carts/metrics
 * Admin: Get abandoned cart metrics
 */

import { Router, Response } from 'express';
import { eq, and, isNotNull, sql } from 'drizzle-orm';
import { ResponseFormatter } from '../../../utils';
import { db } from '../../../database';
import { carts } from '../../cart/shared/carts.schema';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth, requirePermission } from '../../../middlewares';

const handler = async (req: RequestWithUser, res: Response) => {
    // Get total abandoned carts count
    const [abandonedCountResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(carts)
        .where(and(
            eq(carts.cart_status, 'abandoned'),
            eq(carts.is_deleted, false)
        ));

    const totalCarts = abandonedCountResult?.count || 0;

    // Get potential revenue (sum of grand_total)
    const [revenueResult] = await db
        .select({ total: sql<string>`COALESCE(SUM(${carts.grand_total}), 0)` })
        .from(carts)
        .where(and(
            eq(carts.cart_status, 'abandoned'),
            eq(carts.is_deleted, false)
        ));

    const potentialRevenue = parseFloat(revenueResult?.total || '0');

    // Get count of carts where recovery email was sent
    const [emailsSentResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(carts)
        .where(and(
            eq(carts.cart_status, 'abandoned'),
            eq(carts.recovery_email_sent, true),
            eq(carts.is_deleted, false)
        ));

    const emailsSent = emailsSentResult?.count || 0;

    // Get recovered carts count (carts that were abandoned but later converted)
    const [recoveredCountResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(carts)
        .where(and(
            eq(carts.cart_status, 'converted'),
            isNotNull(carts.abandoned_at), // Was abandoned at some point
            eq(carts.is_deleted, false)
        ));

    const recoveredCount = recoveredCountResult?.count || 0;

    // Calculate recovery rate
    const recoveryRate = emailsSent > 0 ? ((recoveredCount / emailsSent) * 100).toFixed(2) : '0.00';

    return ResponseFormatter.success(res, {
        total_carts: totalCarts,
        potential_revenue: potentialRevenue,
        emails_sent: emailsSent,
        recovered_count: recoveredCount,
        recovery_rate: parseFloat(recoveryRate),
    }, 'Abandoned cart metrics retrieved successfully');
};

const router = Router();
router.get('/admin/abandoned-carts/metrics', requireAuth, requirePermission('orders:read'), handler);

export default router;
