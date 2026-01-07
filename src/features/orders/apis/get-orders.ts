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

interface OrderItemSummary {
    id: string;
    product_name: string;
    product_image: string | null;
    quantity: number;
    cost_price: string;
    line_total: string;
}

interface OrderSummary {
    id: string;
    order_number: string;
    order_status: string;
    payment_status: string;
    total_amount: string;
    total_quantity: number;
    items_count: number;
    created_at: Date;
    items: OrderItemSummary[];
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

    // Enrich with items
    const enrichedOrders: OrderSummary[] = await Promise.all(
        userOrders.map(async (order) => {
            const items = await db
                .select({
                    id: orderItems.id,
                    product_name: orderItems.product_name,
                    product_image: orderItems.product_image,
                    quantity: orderItems.quantity,
                    cost_price: orderItems.cost_price,
                    line_total: orderItems.line_total,
                })
                .from(orderItems)
                .where(eq(orderItems.order_id, order.id));

            const itemsCount = items.length;

            const mappedItems: OrderItemSummary[] = items.map(item => ({
                id: item.id,
                product_name: item.product_name,
                product_image: item.product_image,
                quantity: item.quantity,
                cost_price: item.cost_price,
                line_total: item.line_total,
            }));

            return {
                id: order.id,
                order_number: order.order_number,
                order_status: order.order_status,
                payment_status: order.payment_status,
                total_amount: order.total_amount,
                total_quantity: order.total_quantity,
                items_count: itemsCount,
                created_at: order.created_at,
                items: mappedItems,
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
