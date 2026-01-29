/**
 * GET /api/users/:userId/orders
 * Get user orders
 * - Users can view their own orders
 * - Users with orders:read permission can view any user's orders
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq, and, desc, sql } from 'drizzle-orm';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth, requireOwnerOrPermission, validationMiddleware } from '../../../middlewares';
import { ResponseFormatter, uuidSchema, paginationSchema } from '../../../utils';
import { db } from '../../../database';
import { orders } from '../../orders/shared/orders.schema';
import { orderItems } from '../../orders/shared/order-items.schema';

const paramsSchema = z.object({
  userId: uuidSchema,
});

const querySchema = paginationSchema;

interface OrderItemResponse {
  name: string;
  quantity: number;
  price: number;
  image: string;
}

interface OrderResponse {
  id: string;
  date: string;
  status: string;
  total: number;
  deliveryDate?: string;
  trackingNumber?: string;
  items: OrderItemResponse[];
}

const formatDate = (date: Date | null): string => {
  if (!date) return '';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
};

const handler = async (req: RequestWithUser, res: Response) => {
  const { userId } = req.params as unknown as { userId: string };
  const { page, limit } = req.query as unknown as z.infer<typeof querySchema>;

  const offset = (page - 1) * limit;

  // 1. Filter orders by user_id = authenticated user (or authorized user via params)
  // 2. Filter out is_draft = true and is_deleted = true
  const whereConditions = and(
    eq(orders.user_id, userId),
    eq(orders.is_draft, false),
    eq(orders.is_deleted, false)
  );

  // Get total count for pagination
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(orders)
    .where(whereConditions);

  // Fetch orders with pagination
  const userOrders = await db
    .select()
    .from(orders)
    .where(whereConditions)
    .limit(limit)
    .offset(offset)
    .orderBy(desc(orders.created_at));

  // Fetch items for these orders
  const ordersWithItems = await Promise.all(
    userOrders.map(async order => {
      const items = await db.select().from(orderItems).where(eq(orderItems.order_id, order.id));

      const orderItemsMapped: OrderItemResponse[] = items.map(item => ({
        name: item.product_name,
        quantity: item.quantity,
        price: Number(item.line_total),
        image: item.product_image || '',
      }));

      // 4. Format dates for display
      // 5. Map order_status to frontend status enum
      const orderResponse: OrderResponse = {
        id: order.order_number, // User requested string ID like ORD-2024-001
        date: formatDate(order.created_at),
        status: order.order_status, // Schema enum matches frontend expectations closely
        total: Number(order.total_amount),
        deliveryDate: order.delivery_date ? formatDate(order.delivery_date) : undefined,
        trackingNumber: order.order_tracking || undefined,
        items: orderItemsMapped,
      };

      return orderResponse;
    })
  );

  ResponseFormatter.paginated(
    res,
    ordersWithItems,
    {
      page,
      limit,
      total: Number(count),
    },
    'Orders retrieved successfully'
  );
};

const router = Router();
router.get(
  '/:userId/orders',
  requireAuth,
  validationMiddleware(paramsSchema, 'params'),
  validationMiddleware(querySchema, 'query'),
  requireOwnerOrPermission('userId', 'orders:read'), // specific permission check: user sees own, or admin with perm sees others
  handler
);

export default router;
