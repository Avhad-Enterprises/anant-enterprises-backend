import { pgEnum } from 'drizzle-orm/pg-core';

/**
 * Notification Type Enum
 * Defines all possible notification categories
 */
export const notificationTypeEnum = pgEnum('notification_type', [
    // Order notifications
    'order_created',
    'order_paid',
    'order_shipped',
    'order_delivered',
    'order_cancelled',

    // Payment notifications
    'payment_authorized',
    'payment_captured',
    'payment_failed',
    'payment_refunded',

    // Inventory notifications
    'inventory_low_stock',
    'inventory_out_of_stock',
    'inventory_restocked',

    // User notifications
    'user_welcome',
    'account_updated',
    'password_changed',

    // Admin notifications
    'admin_broadcast',
    'system_alert',

    // Marketing
    'promotion',
    'newsletter',
]);

/**
 * Notification Priority Enum
 */
export const notificationPriorityEnum = pgEnum('notification_priority', [
    'low',
    'normal',
    'high',
    'urgent',
]);

/**
 * Notification Frequency Enum
 */
export const notificationFrequencyEnum = pgEnum('notification_frequency', [
    'immediate',
    'daily_digest',
    'weekly_digest',
    'never',
]);

/**
 * Delivery Status Enum
 */
export const deliveryStatusEnum = pgEnum('delivery_status', [
    'pending',
    'sent',
    'delivered',
    'failed',
    'bounced',
]);
