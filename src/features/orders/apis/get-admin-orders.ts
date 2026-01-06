/**
 * GET /api/admin/orders
 * Admin: Get all orders with filters
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq, and, desc, count, gte, lte } from 'drizzle-orm';
import { ResponseFormatter, paginationSchema } from '../../../utils';
import { db } from '../../../database';
import { orders } from '../shared/orders.schema';
import { orderItems } from '../shared/order-items.schema';
import { users } from '../../user/shared/user.schema';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth, requirePermission } from '../../../middlewares';

const querySchema = paginationSchema.extend({
    status: z.enum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']).optional(),
    payment_status: z.enum(['pending', 'authorized', 'partially_paid', 'paid', 'refunded', 'failed', 'partially_refunded']).optional(),
    fulfillment_status: z.enum(['unfulfilled', 'partial', 'fulfilled', 'returned', 'cancelled']).optional(),
    from_date: z.string().optional(),
    to_date: z.string().optional(),
    search: z.string().optional(), // Search by order number or customer email
});

const handler = async (req: RequestWithUser, res: Response) => {
    const params = querySchema.parse(req.query);
    const offset = (params.page - 1) * params.limit;

    // Build where conditions
    const conditions = [
        eq(orders.is_deleted, false),
        eq(orders.is_draft, false),
    ];

    if (params.status) {
        conditions.push(eq(orders.order_status, params.status));
    }

    if (params.payment_status) {
        conditions.push(eq(orders.payment_status, params.payment_status));
    }

    if (params.fulfillment_status) {
        conditions.push(eq(orders.fulfillment_status, params.fulfillment_status));
    }

    if (params.from_date) {
        conditions.push(gte(orders.created_at, new Date(params.from_date)));
    }

    if (params.to_date) {
        conditions.push(lte(orders.created_at, new Date(params.to_date)));
    }

    // Get total count
    const [countResult] = await db
        .select({ total: count() })
        .from(orders)
        .where(and(...conditions));

    const total = countResult?.total || 0;

    // Get orders with user info
    const adminOrders = await db
        .select({
            id: orders.id,
            order_number: orders.order_number,
            order_status: orders.order_status,
            payment_status: orders.payment_status,
            payment_method: orders.payment_method,
            fulfillment_status: orders.fulfillment_status,
            total_amount: orders.total_amount,
            total_quantity: orders.total_quantity,
            channel: orders.channel,
            created_at: orders.created_at,
            user_id: orders.user_id,
            customer_email: users.email,
            customer_name: users.name,
        })
        .from(orders)
        .leftJoin(users, eq(orders.user_id, users.id))
        .where(and(...conditions))
        .orderBy(desc(orders.created_at))
        .limit(params.limit)
        .offset(offset);

    // Filter by search if provided (after query due to OR condition complexity)
    let filteredOrders = adminOrders;
    if (params.search) {
        const searchLower = params.search.toLowerCase();
        filteredOrders = adminOrders.filter(order =>
            order.order_number.toLowerCase().includes(searchLower) ||
            order.customer_email?.toLowerCase().includes(searchLower) ||
            order.customer_name?.toLowerCase().includes(searchLower)
        );
    }

    // Enrich with items count
    const enrichedOrders = await Promise.all(
        filteredOrders.map(async (order) => {
            const [itemCount] = await db
                .select({ count: count() })
                .from(orderItems)
                .where(eq(orderItems.order_id, order.id));

            return {
                ...order,
                items_count: itemCount?.count || 0,
            };
        })
    );

    return ResponseFormatter.success(res, {
        orders: enrichedOrders,
        pagination: {
            page: params.page,
            limit: params.limit,
            total,
            totalPages: Math.ceil(total / params.limit),
        },
    }, 'Orders retrieved successfully');
};

const router = Router();
router.get('/admin/orders', requireAuth, requirePermission('orders:read'), handler);

export default router;
