/**
 * GET /api/admin/orders
 * Admin: Get all orders with filters
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq, and, or, desc, asc, count, gte, lte, inArray } from 'drizzle-orm';
import { ResponseFormatter, paginationSchema } from '../../../utils';
import { db } from '../../../database';
import { orders } from '../shared/orders.schema';
import { orderItems } from '../shared/order-items.schema';
import { users } from '../../user/shared/user.schema';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth, requirePermission } from '../../../middlewares';

const querySchema = paginationSchema.extend({
    status: z.enum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']).optional(),
    payment_status: z.string().optional(),
    fulfillment_status: z.string().optional(),
    amount_ranges: z.string().optional(), // Comma-separated: '0-1000', '1000-5000', '5000-10000', 'Over-10000'
    item_ranges: z.string().optional(),   // Comma-separated: '1-2', '3-5', '6-10', 'Over-10'
    from_date: z.string().optional(),
    to_date: z.string().optional(),
    search: z.string().optional(), // Search by order number or customer email
    sort_by: z.string().optional(),
    sort_order: z.enum(['asc', 'desc']).optional(),
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
        const statuses = params.payment_status.split(',').filter(Boolean);
        if (statuses.length > 0) {
            conditions.push(inArray(orders.payment_status, statuses as any));
        }
    }

    if (params.fulfillment_status) {
        const statuses = params.fulfillment_status.split(',').filter(Boolean);
        if (statuses.length > 0) {
            conditions.push(inArray(orders.fulfillment_status, statuses as any));
        }
    }

    if (params.from_date) {
        conditions.push(gte(orders.created_at, new Date(params.from_date)));
    }

    if (params.to_date) {
        conditions.push(lte(orders.created_at, new Date(params.to_date)));
    }

    // Amount Range Filtering
    if (params.amount_ranges) {
        const ranges = params.amount_ranges.split(',').filter(Boolean);
        const rangeConditions = ranges.map(range => {
            if (range === '0-1000') return and(gte(orders.total_amount, '0'), lte(orders.total_amount, '1000'));
            if (range === '1000-5000') return and(gte(orders.total_amount, '1000'), lte(orders.total_amount, '5000'));
            if (range === '5000-10000') return and(gte(orders.total_amount, '5000'), lte(orders.total_amount, '10000'));
            if (range === 'Over-10000') return gte(orders.total_amount, '10000');
            return null;
        }).filter(Boolean);

        if (rangeConditions.length > 0) {
            conditions.push(or(...(rangeConditions as any))!);
        }
    }

    // Item Quantity Range Filtering
    if (params.item_ranges) {
        const ranges = params.item_ranges.split(',').filter(Boolean);
        const rangeConditions = ranges.map(range => {
            if (range === '1-2') return and(gte(orders.total_quantity, 1), lte(orders.total_quantity, 2));
            if (range === '3-5') return and(gte(orders.total_quantity, 3), lte(orders.total_quantity, 5));
            if (range === '6-10') return and(gte(orders.total_quantity, 6), lte(orders.total_quantity, 10));
            if (range === 'Over-10') return gte(orders.total_quantity, 10);
            return null;
        }).filter(Boolean);

        if (rangeConditions.length > 0) {
            conditions.push(or(...(rangeConditions as any))!);
        }
    }

    // Get total count
    const [countResult] = await db
        .select({ total: count() })
        .from(orders)
        .where(and(...conditions));

    const total = countResult?.total || 0;

    // Determine sorting
    const sortField = params.sort_by || 'created_at';
    const sortOrder = params.sort_order === 'asc' ? asc : desc;

    const getSortColumn = (field: string) => {
        switch (field) {
            case 'order_number': return orders.order_number;
            case 'order_status': return orders.order_status;
            case 'payment_status': return orders.payment_status;
            case 'total_amount': return orders.total_amount;
            case 'customer_name': return users.name;
            case 'created_at':
            default: return orders.created_at;
        }
    };

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
        .orderBy(sortOrder(getSortColumn(sortField)))
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

    // DEBUG: Log the response data
    console.log('========== GET /api/admin/orders DEBUG ==========');
    console.log('Query params:', params);
    console.log('Total count:', total);
    console.log('Enriched orders count:', enrichedOrders.length);
    console.log('First order sample:', enrichedOrders[0] || 'No orders found');
    console.log('=================================================');

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
