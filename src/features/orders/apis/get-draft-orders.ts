/**
 * GET /api/admin/orders/drafts
 * Get all draft orders with pagination and filtering
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq, and, desc, count, gte, lte } from 'drizzle-orm';
import { ResponseFormatter, paginationSchema, logger } from '../../../utils';
import { db } from '../../../database';
import { orders } from '../shared/orders.schema';
import { orderItems } from '../shared/order-items.schema';
import { users } from '../../user/shared/user.schema';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth, requirePermission } from '../../../middlewares';

const querySchema = paginationSchema.extend({
    search: z.string().optional(), // Search by order number or customer email/name
    from_date: z.string().optional(),
    to_date: z.string().optional(),
    sort_by: z.enum([
        'id',
        'order_number',
        'order_status',
        'payment_status',
        'total_amount',
        'total_quantity',
        'channel',
        'created_at',
        'updated_at',
        'delivery_price',
        'return_amount',
        'discount_amount',
        'customer_name',
        'customer_email'
    ]).default('created_at'),
    sort_order: z.enum(['asc', 'desc']).default('desc'),
});

const handler = async (req: RequestWithUser, res: Response) => {
    const params = querySchema.parse(req.query);
    const offset = (params.page - 1) * params.limit;

    logger.info('GET /api/admin/orders/drafts', { params });

    // Build where conditions
    const conditions = [
        eq(orders.is_draft, true),
        eq(orders.is_deleted, false),
    ];

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

    // Resolve sort column
    let sortCol: any = orders[params.sort_by as keyof typeof orders];
    if (params.sort_by === 'customer_name') sortCol = users.name;
    if (params.sort_by === 'customer_email') sortCol = users.email;

    // Get draft orders with customer info
    const draftOrders = await db
        .select({
            id: orders.id,
            order_number: orders.order_number,
            order_status: orders.order_status,
            payment_status: orders.payment_status,
            total_amount: orders.total_amount,
            total_quantity: orders.total_quantity,
            channel: orders.channel,
            created_at: orders.created_at,
            updated_at: orders.updated_at,
            user_id: orders.user_id,
            customer_email: users.email,
            customer_name: users.name,
            customer_note: orders.customer_note,
            admin_comment: orders.admin_comment,
        })
        .from(orders)
        .leftJoin(users, eq(orders.user_id, users.id))
        .where(and(...conditions))
        .orderBy(
            params.sort_order === 'desc'
                ? desc(sortCol)
                : sortCol
        )
        .limit(params.limit)
        .offset(offset);

    // Filter by search if provided
    let filteredOrders = draftOrders;
    if (params.search) {
        const searchLower = params.search.toLowerCase();
        filteredOrders = draftOrders.filter(
            (order) =>
                order.order_number.toLowerCase().includes(searchLower) ||
                order.customer_email?.toLowerCase().includes(searchLower) ||
                order.customer_name?.toLowerCase().includes(searchLower)
        );
    }

    // Enrich with items count and preview
    const enrichedOrders = await Promise.all(
        filteredOrders.map(async (order) => {
            const items = await db
                .select({
                    id: orderItems.id,
                    product_name: orderItems.product_name,
                    quantity: orderItems.quantity,
                    line_total: orderItems.line_total,
                })
                .from(orderItems)
                .where(eq(orderItems.order_id, order.id))
                .limit(3); // Only get first 3 for preview

            const [itemCount] = await db
                .select({ count: count() })
                .from(orderItems)
                .where(eq(orderItems.order_id, order.id));

            return {
                ...order,
                items_count: itemCount?.count || 0,
                items_preview: items,
            };
        })
    );

    return ResponseFormatter.success(
        res,
        {
            drafts: enrichedOrders,
            pagination: {
                page: params.page,
                limit: params.limit,
                total,
                totalPages: Math.ceil(total / params.limit),
            },
        },
        'Draft orders retrieved successfully'
    );
};

const router = Router();
router.get('/admin/orders/drafts', requireAuth, requirePermission('orders:read'), handler);

export default router;
