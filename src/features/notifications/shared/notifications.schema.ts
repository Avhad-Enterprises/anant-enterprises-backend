import { pgTable, uuid, varchar, text, boolean, timestamp, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { users } from '../../user';

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
 * Notifications Table
 * Stores all user notifications
 */
export const notifications = pgTable('notifications', {
    id: uuid('id').primaryKey().defaultRandom(),
    user_id: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

    // Content
    type: notificationTypeEnum('type').notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    message: text('message').notNull(),

    // Rich data payload
    data: jsonb('data').$type<Record<string, any>>().default({}),

    // Read tracking
    is_read: boolean('is_read').default(false).notNull(),
    read_at: timestamp('read_at', { withTimezone: true }),

    // Delivery channels used
    channels: jsonb('channels').$type<string[]>().default(['in_app']).notNull(),

    // Priority
    priority: notificationPriorityEnum('priority').default('normal').notNull(),

    // Call-to-action
    action_url: varchar('action_url', { length: 500 }),
    action_text: varchar('action_text', { length: 100 }),

    // Lifecycle
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    expires_at: timestamp('expires_at', { withTimezone: true }),
    deleted_at: timestamp('deleted_at', { withTimezone: true }),

    // Metadata
    metadata: jsonb('metadata').$type<Record<string, any>>().default({}),
});

// Export types
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
export type NotificationType = Notification['type'];
export type NotificationPriority = Notification['priority'];
