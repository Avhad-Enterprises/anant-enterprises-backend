/**
 * Shared Order Creation Helpers
 * Used by both cart checkout and direct order flows
 */

import { eq } from 'drizzle-orm';
import { db } from '../../../database';
import { users } from '../../user/shared/user.schema';
import { eventPublisher } from '../../queue/services/event-publisher.service';
import { getAllAdminUserIds } from '../../rbac/shared/queries';
import { TEMPLATE_CODES } from '../../notifications/shared/constants';
import { validateStockAvailability } from '../../inventory/services/inventory.service';
import { HttpException, logger } from '../../../utils';

// Get base URLs from environment
const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '');
const ADMIN_URL = (process.env.ADMIN_URL || 'http://localhost:5173').replace(/\/+$/, '');

/**
 * Queue customer email notification for new order
 * 
 * Sends a confirmation email to the customer with order details and a link to view the order.
 * This function runs asynchronously and will not throw errors if notification fails.
 * 
 * @param userId - Customer's user ID
 * @param orderId - Unique order ID (UUID)
 * @param orderNumber - Human-readable order number (e.g., "ORD-26-000123")
 * @param totalAmount - Order total amount as string
 * @param currency - Currency code (e.g., "INR", "USD")
 * @returns Promise that resolves when notification is queued (doesn't fail on error)
 * 
 * @example
 * await queueCustomerOrderNotification(
 *   'user-123',
 *   'order-uuid',
 *   'ORD-26-000001',
 *   '1234.56',
 *   'INR'
 * );
 */
export async function queueCustomerOrderNotification(
    userId: string,
    orderId: string,
    orderNumber: string,
    totalAmount: string,
    currency: string
): Promise<void> {
    try {
        const [customer] = await db
            .select({ name: users.first_name, email: users.email })
            .from(users)
            .where(eq(users.id, userId))
            .limit(1);

        await eventPublisher.publishNotification({
            userId,
            templateCode: TEMPLATE_CODES.ORDER_CREATED,
            variables: {
                userName: customer?.name || 'Customer',
                orderNumber,
                total: Number(totalAmount).toFixed(2),
                currency,
                orderUrl: `${FRONTEND_URL}/profile/orders/${orderId}`,
            },
            options: {
                priority: 'high',
                actionUrl: `/profile/orders/${orderId}`,
                actionText: 'View Order',
            },
        });

        logger.info('Customer order notification queued', { userId, orderId, orderNumber });
    } catch (error) {
        logger.error('Failed to queue customer notification', { userId, orderId, error });
        // Don't throw - notifications are non-critical
    }
}

/**
 * Queue admin notification for new order to all admin users
 * 
 * Sends batch notifications to all admin users alerting them of a new order.
 * Each admin receives a notification with order details and link to admin panel.
 * This function runs asynchronously and will not throw errors if notification fails.
 * 
 * @param orderId - Unique order ID (UUID)
 * @param orderNumber - Human-readable order number (e.g., "ORD-26-000123")
 * @param customerName - Name of the customer who placed the order
 * @param totalAmount - Order total amount as string
 * @returns Promise that resolves when notifications are queued (doesn't fail on error)
 * 
 * @example
 * await queueAdminOrderNotification(
 *   'order-uuid',
 *   'ORD-26-000001',
 *   'John Doe',
 *   '1234.56'
 * );
 */
export async function queueAdminOrderNotification(
    orderId: string,
    orderNumber: string,
    customerName: string,
    totalAmount: string
): Promise<void> {
    try {
        logger.info('Fetching admin user IDs for notification...');
        const adminUserIds = await getAllAdminUserIds();
        logger.info('Admin user IDs fetched', { count: adminUserIds.length, ids: adminUserIds });

        if (adminUserIds.length > 0) {
            await eventPublisher.publishBatchNotification({
                userIds: adminUserIds,
                templateCode: TEMPLATE_CODES.NEW_ORDER_RECEIVED,
                variables: {
                    orderNumber,
                    customerName,
                    total: Number(totalAmount).toFixed(2),
                    orderUrl: `${ADMIN_URL}/orders/${orderId}`,
                },
                options: {
                    priority: 'normal',
                    actionUrl: `/orders/${orderId}`,
                    actionText: 'View Order',
                },
            });

            logger.info('Admin notifications queued', { count: adminUserIds.length, orderId });
        } else {
            logger.warn('No admin users found for order notification');
        }
    } catch (error) {
        logger.error('Failed to queue admin notification', { orderId, error });
        // Don't throw - notifications are non-critical
    }
}

/**
 * Validate stock availability for order items and handle appropriately
 * 
 * Checks if sufficient stock exists for all items in the order.
 * Behavior depends on `allowOverselling` parameter:
 * - If `true`: Logs warning but allows order to proceed (admin override)
 * - If `false`: Throws HttpException preventing order creation (user orders)
 * 
 * @param items - Array of items to validate with product IDs and quantities
 * @param allowOverselling - Whether to allow order with insufficient stock
 * @throws {HttpException} 400 if stock insufficient and overselling not allowed
 * 
 * @example
 * // User order - strict validation
 * await validateAndWarnStock(
 *   [{ product_id: 'prod-123', quantity: 5 }],
 *   false  // Will throw if insufficient stock
 * );
 * 
 * @example
 * // Admin order - allow overselling
 * await validateAndWarnStock(
 *   [{ product_id: 'prod-123', quantity: 100 }],
 *   true  // Will log warning but proceed
 * );
 */
export async function validateAndWarnStock(
    items: Array<{ product_id: string; quantity: number }>,
    allowOverselling: boolean
): Promise<void> {
    if (items.length === 0) {
        return;
    }

    const validations = await validateStockAvailability(items);
    const failures = validations.filter(v => !v.available);

    if (failures.length > 0) {
        const errorMessages = failures.map(f => f.message).join('; ');

        if (allowOverselling) {
            logger.warn(`Order proceeding with insufficient stock: ${errorMessages}`);
        } else {
            throw new HttpException(400, `Insufficient stock: ${errorMessages}`);
        }
    }
}

/**
 * Transform order items from request format to database format
 * 
 * Maps order item data to the structure required for `order_items` table insertion.
 * Handles default values for missing fields and type conversions.
 * 
 * @param orderId - Order ID to associate items with
 * @param items - Array of order items from request/cart
 * @returns Array of items formatted for database insertion
 * 
 * @example
 * const dbItems = mapOrderItems('order-uuid', [
 *   {
 *     product_id: 'prod-123',
 *     sku: 'WIDGET-001',
 *     product_name: 'Premium Widget',
 *     quantity: 2,
 *     cost_price: 50,
 *     line_total: 200
 *   }
 * ]);
 * // Returns: [{ order_id: 'order-uuid', product_id: 'prod-123', sku: 'WIDGET-001', ... }]
 */
export function mapOrderItems(
    orderId: string,
    items: Array<{
        product_id: string;
        sku?: string;
        product_name?: string;
        product_image?: string;
        cost_price: string | number;
        quantity: number;
        line_total: string | number;
    }>
) {
    return items.map(item => ({
        order_id: orderId,
        product_id: item.product_id,
        sku: item.sku || 'UNKNOWN',
        product_name: item.product_name || 'Unknown Product',
        product_image: item.product_image,
        cost_price: String(item.cost_price),
        quantity: item.quantity,
        line_total: String(item.line_total),
    }));
}
