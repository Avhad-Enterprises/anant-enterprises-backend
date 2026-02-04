/**
 * Orders Shared Queries
 * 
 * Reusable database queries for order operations
 */

import { eq, and, desc } from 'drizzle-orm';
import { db } from '../../../database';
import { orders } from './orders.schema';
import { orderItems } from './order-items.schema';

/**
 * Get order by ID with all related items
 * @param orderId - Order UUID
 * @returns Order with items array
 */
export async function getOrderWithItems(orderId: string) {
    const [order] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, orderId))
        .limit(1);

    if (!order) {
        return null;
    }

    const items = await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.order_id, orderId));

    return {
        ...order,
        items,
    };
}

/**
 * Get order by order number
 * @param orderNumber - Unique order number (e.g., "ORD-24-000123")
 * @returns Order record or null
 */
export async function getOrderByNumber(orderNumber: string) {
    const [order] = await db
        .select()
        .from(orders)
        .where(eq(orders.order_number, orderNumber))
        .limit(1);

    return order || null;
}

/**
 * Get base query builder for user orders
 * Filters out deleted and draft orders by default
 * @param userId - User UUID
 * @returns Query builder for user orders
 */
export function getUserOrdersQuery(userId: string) {
    return db
        .select()
        .from(orders)
        .where(
            and(
                eq(orders.user_id, userId),
                eq(orders.is_deleted, false),
                eq(orders.is_draft, false)
            )
        )
        .orderBy(desc(orders.created_at));
}

/**
 * Get order items for a specific order
 * @param orderId - Order UUID
 * @returns Array of order items
 */
export async function getOrderItems(orderId: string) {
    const items = await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.order_id, orderId));

    return items;
}
