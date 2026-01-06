/**
 * GET /api/orders
 * Get user's order history with pagination
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq, and, desc, count } from 'drizzle-orm';
import { ResponseFormatter, paginationSchema } from '../../../utils';
import { HttpException } from '../../../utils';
import { db } from '../../../database';
import { orders } from '../shared/orders.schema';
import { orderItems } from '../shared/order-items.schema';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth } from '../../../middlewares';

const querySchema = paginationSchema.extend({
    status: z.enum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']).optional(),
});

interface OrderSummary {
    id: string;
    order_number: string;
    order_status: string;
    payment_status: string;
    total_amount: string;
    total_quantity: number;
    items_count: number;
    created_at: Date;
    first_item_image: string | null;
}

const handler = async (req: RequestWithUser, res: Response) => {
    const userId = req.userId;
    if (!userId) {
        throw new HttpException(401, 'Authentication required');
    }

    const { page, limit, status } = querySchema.parse(req.query);
    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [
        eq(orders.user_id, userId),
        eq(orders.is_deleted, false),
        eq(orders.is_draft, false),
    ];

    if (status) {
        conditions.push(eq(orders.order_status, status));
    }

    // Get total count
    const [countResult] = await db
        .select({ total: count() })
        .from(orders)
        .where(and(...conditions));

    const total = countResult?.total || 0;

    // Get orders
    const userOrders = await db
        .select()
        .from(orders)
        .where(and(...conditions))
        .orderBy(desc(orders.created_at))
        .limit(limit)
        .offset(offset);

    // Enrich with first item image and items count
    const enrichedOrders: OrderSummary[] = await Promise.all(
        userOrders.map(async (order) => {
            const items = await db
                .select({
                    product_image: orderItems.product_image,
                })
                .from(orderItems)
                .where(eq(orderItems.order_id, order.id))
                .limit(1);

            const [itemCount] = await db
                .select({ count: count() })
                .from(orderItems)
                .where(eq(orderItems.order_id, order.id));

            return {
                id: order.id,
                order_number: order.order_number,
                order_status: order.order_status,
                payment_status: order.payment_status,
                total_amount: order.total_amount,
                total_quantity: order.total_quantity,
                items_count: itemCount?.count || 0,
                created_at: order.created_at,
                first_item_image: items[0]?.product_image || null,
            };
        })
    );

    return ResponseFormatter.success(res, {
        orders: enrichedOrders,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    }, 'Orders retrieved successfully');
};

const router = Router();
router.get('/', requireAuth, handler);

export default router;
