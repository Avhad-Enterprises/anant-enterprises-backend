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

/**
 * Build dynamic order query conditions based on provided filters
 * 
 * This helper consolidates common filtering logic used across multiple endpoints
 * to reduce code duplication and ensure consistent filtering behavior.
 * 
 * @param filters - Filter criteria object
 * @param filters.userId - Filter by specific user ID
 * @param filters.status - Filter by order status
 * @param filters.paymentStatus - Filter by payment status
 * @param filters.fulfillmentStatus - Filter by fulfillment status
 * @param filters.dateFrom - Filter orders created on or after this date
 * @param filters.dateTo - Filter orders created on or before this date
 * @param filters.isDraft - Filter draft vs confirmed orders (default: false)
 * @param filters.isDeleted - Include/exclude deleted orders (default: false)
 * @returns Array of Drizzle query conditions
 * 
 * @example
 * // Filter confirmed orders for a specific user
 * const conditions = buildOrderQueryConditions({
 *   userId: 'user-123',
 *   status: 'confirmed',
 *   isDraft: false
 * });
 * 
 * const results = await db
 *   .select()
 *   .from(orders)
 *   .where(and(...conditions));
 */
export function buildOrderQueryConditions(filters: {
    userId?: string;
    status?: string;
    paymentStatus?: string;
    fulfillmentStatus?: string;
    dateFrom?: Date;
    dateTo?: Date;
    isDraft?: boolean;
    isDeleted?: boolean;
}) {
    const conditions = [];

    // User filter
    if (filters.userId !== undefined) {
        conditions.push(eq(orders.user_id, filters.userId));
    }

    // Status filters
    if (filters.status) {
        conditions.push(eq(orders.order_status, filters.status as any));
    }

    if (filters.paymentStatus) {
        conditions.push(eq(orders.payment_status, filters.paymentStatus as any));
    }

    if (filters.fulfillmentStatus) {
        conditions.push(eq(orders.fulfillment_status, filters.fulfillment_status as any));
    }

    // Date range filters
    if (filters.dateFrom) {
        conditions.push(gte(orders.created_at, filters.dateFrom));
    }

    if (filters.dateTo) {
        conditions.push(lte(orders.created_at, filters.dateTo));
    }

    // Draft/deleted filters (with defaults)
    if (filters.isDraft !== undefined) {
        conditions.push(eq(orders.is_draft, filters.isDraft));
    } else {
        conditions.push(eq(orders.is_draft, false));
    }

    if (filters.isDeleted !== undefined) {
        conditions.push(eq(orders.is_deleted, filters.isDeleted));
    } else {
        conditions.push(eq(orders.is_deleted, false));
    }

    return conditions;
}
