/**
 * Dashboard Statistics API
 * GET /api/dashboard/stats
 * 
 * Returns aggregated statistics for the admin dashboard.
 */

import { Router, Response, Request } from 'express';
import { ResponseFormatter } from '../../../utils';
import { db } from '../../../database';
import { users } from '../../user/shared/user.schema';
import { products } from '../../product/shared/product.schema';
import { blogs } from '../../blog/shared/blog.schema';
import { tags } from '../../tags/shared/tags.schema';
import { tiers } from '../../tiers/shared/tiers.schema';
import { invitations } from '../../admin-invite/shared/admin-invite.schema';
import { orders } from '../../orders/shared/orders.schema';
import { auditLogs } from '../../audit/shared/audit-logs.schema';
import { eq, sql, and, gte, desc } from 'drizzle-orm';
import { requireAuth } from '../../../middlewares';

interface DashboardStats {
    // Counts
    totalCustomers: number;
    totalProducts: number;
    totalBlogs: number;
    totalTiers: number;
    totalTags: number;
    pendingInvitations: number;

    // This month's stats
    customersThisMonth: number;

    // Recent products
    recentProducts: Array<{
        id: string;
        title: string;
        sku: string;
        status: string;
        sellingPrice: string;
        primaryImageUrl: string | null;
        createdAt: Date;
    }>;

    recentCustomers: Array<{
        id: string;
        name: string;
        email: string;
        profileImageUrl: string | null;
        createdAt: Date;
    }>;

    // Recent activity (audit logs)
    recentActivity: Array<{
        id: number;
        action: string;
        resourceType: string;
        resourceId: string | null;
        userEmail: string | null;
        timestamp: Date;
    }>;

    // Order statistics
    orderStats: {
        totalOrders: number;
        pendingOrders: number;
        confirmedOrders: number;
        processingOrders: number;
        shippedOrders: number;
        deliveredOrders: number;
        cancelledOrders: number;
    };

    // Breakdown stats
    tagsByType: Array<{
        type: string;
        count: number;
    }>;

    tiersByLevel: Array<{
        level: number;
        count: number;
    }>;
}

const handler = async (req: Request, res: Response) => {
    // Get first day of current month
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Run all queries in parallel for efficiency
    const [
        totalCustomersResult,
        totalProductsResult,
        totalBlogsResult,
        totalTiersResult,
        totalTagsResult,
        pendingInvitationsResult,
        customersThisMonthResult,
        recentProductsResult,
        recentCustomersResult,
        recentActivityResult,
        tagsByTypeResult,
        tiersByLevelResult,
        // Order statistics
        totalOrdersResult,
        pendingOrdersResult,
        confirmedOrdersResult,
        processingOrdersResult,
        shippedOrdersResult,
        deliveredOrdersResult,
        cancelledOrdersResult,
    ] = await Promise.all([
        // Total customers (non-deleted users)
        db.select({ count: sql<number>`count(*)::int` })
            .from(users)
            .where(eq(users.is_deleted, false)),

        // Total products (non-deleted)
        db.select({ count: sql<number>`count(*)::int` })
            .from(products)
            .where(eq(products.is_deleted, false)),

        // Total blogs
        db.select({ count: sql<number>`count(*)::int` })
            .from(blogs),

        // Total tiers
        db.select({ count: sql<number>`count(*)::int` })
            .from(tiers),

        // Total tags (non-deleted)
        db.select({ count: sql<number>`count(*)::int` })
            .from(tags)
            .where(eq(tags.is_deleted, false)),

        // Pending invitations
        db.select({ count: sql<number>`count(*)::int` })
            .from(invitations)
            .where(and(
                eq(invitations.status, 'pending'),
                eq(invitations.is_deleted, false)
            )),

        // Customers created this month
        db.select({ count: sql<number>`count(*)::int` })
            .from(users)
            .where(and(
                eq(users.is_deleted, false),
                gte(users.created_at, firstDayOfMonth)
            )),

        // Recent 4 products
        db.select({
            id: products.id,
            title: products.product_title,
            sku: products.sku,
            status: products.status,
            sellingPrice: products.selling_price,
            primaryImageUrl: products.primary_image_url,
            createdAt: products.created_at,
        })
            .from(products)
            .where(eq(products.is_deleted, false))
            .orderBy(desc(products.created_at))
            .limit(4),

        // Recent 5 customers
        db.select({
            id: users.id,
            name: users.first_name,
            email: users.email,
            profileImageUrl: users.profile_image_url,
            createdAt: users.created_at,
        })
            .from(users)
            .where(eq(users.is_deleted, false))
            .orderBy(desc(users.created_at))
            .limit(5),

        // Recent 6 audit logs (activity)
        db.select({
            id: auditLogs.id,
            action: auditLogs.action,
            resourceType: auditLogs.resource_type,
            resourceId: auditLogs.resource_id,
            userEmail: auditLogs.user_email,
            timestamp: auditLogs.timestamp,
        })
            .from(auditLogs)
            .orderBy(desc(auditLogs.timestamp))
            .limit(6),

        // Tags grouped by type
        db.select({
            type: tags.type,
            count: sql<number>`count(*)::int`,
        })
            .from(tags)
            .where(eq(tags.is_deleted, false))
            .groupBy(tags.type),

        // Tiers grouped by level
        db.select({
            level: tiers.level,
            count: sql<number>`count(*)::int`,
        })
            .from(tiers)
            .groupBy(tiers.level)
            .orderBy(tiers.level),

        // Order statistics
        db.select({ count: sql<number>`count(*)::int` })
            .from(orders)
            .where(eq(orders.is_deleted, false)),

        db.select({ count: sql<number>`count(*)::int` })
            .from(orders)
            .where(and(eq(orders.is_deleted, false), eq(orders.order_status, 'pending'))),

        db.select({ count: sql<number>`count(*)::int` })
            .from(orders)
            .where(and(eq(orders.is_deleted, false), eq(orders.order_status, 'confirmed'))),

        db.select({ count: sql<number>`count(*)::int` })
            .from(orders)
            .where(and(eq(orders.is_deleted, false), eq(orders.order_status, 'processing'))),

        db.select({ count: sql<number>`count(*)::int` })
            .from(orders)
            .where(and(eq(orders.is_deleted, false), eq(orders.order_status, 'shipped'))),

        db.select({ count: sql<number>`count(*)::int` })
            .from(orders)
            .where(and(eq(orders.is_deleted, false), eq(orders.order_status, 'delivered'))),

        db.select({ count: sql<number>`count(*)::int` })
            .from(orders)
            .where(and(eq(orders.is_deleted, false), eq(orders.order_status, 'cancelled'))),
    ]);

    const stats: DashboardStats = {
        totalCustomers: totalCustomersResult[0]?.count ?? 0,
        totalProducts: totalProductsResult[0]?.count ?? 0,
        totalBlogs: totalBlogsResult[0]?.count ?? 0,
        totalTiers: totalTiersResult[0]?.count ?? 0,
        totalTags: totalTagsResult[0]?.count ?? 0,
        pendingInvitations: pendingInvitationsResult[0]?.count ?? 0,
        customersThisMonth: customersThisMonthResult[0]?.count ?? 0,
        recentProducts: recentProductsResult,
        recentCustomers: recentCustomersResult,
        recentActivity: recentActivityResult,
        orderStats: {
            totalOrders: totalOrdersResult[0]?.count ?? 0,
            pendingOrders: pendingOrdersResult[0]?.count ?? 0,
            confirmedOrders: confirmedOrdersResult[0]?.count ?? 0,
            processingOrders: processingOrdersResult[0]?.count ?? 0,
            shippedOrders: shippedOrdersResult[0]?.count ?? 0,
            deliveredOrders: deliveredOrdersResult[0]?.count ?? 0,
            cancelledOrders: cancelledOrdersResult[0]?.count ?? 0,
        },
        tagsByType: tagsByTypeResult,
        tiersByLevel: tiersByLevelResult,
    };

    ResponseFormatter.success(res, stats, 'Dashboard stats retrieved successfully');
};

const router = Router();
router.get('/stats', requireAuth, handler);

export default router;
