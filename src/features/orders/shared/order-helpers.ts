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
 * Queue customer notification for new order
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
 * Queue admin notifications for new order
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
 * Validate stock availability and handle warnings/errors
 * @param items - Items to validate
 * @param allowOverselling - If true, log warning; if false, throw error
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
 * Map order items for database insertion
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
