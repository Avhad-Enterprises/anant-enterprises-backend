import { pgTable, uuid, varchar, text, timestamp, jsonb, pgEnum, integer } from 'drizzle-orm/pg-core';
import { notifications } from './notifications.schema';

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

/**
 * Notification Delivery Logs Table
 * Tracks delivery attempts for each notification channel
 */
export const notificationDeliveryLogs = pgTable('notification_delivery_logs', {
    id: uuid('id').primaryKey().defaultRandom(),
    notification_id: uuid('notification_id').notNull().references(() => notifications.id, { onDelete: 'cascade' }),

    // Delivery details
    channel: varchar('channel', { length: 50 }).notNull(),
    status: deliveryStatusEnum('status').default('pending').notNull(),

    // Recipient
    recipient: varchar('recipient', { length: 255 }),

    // Provider details
    provider: varchar('provider', { length: 100 }),
    provider_message_id: varchar('provider_message_id', { length: 255 }),
    provider_response: jsonb('provider_response').$type<Record<string, any>>(),

    // Error tracking
    error_message: text('error_message'),
    error_code: varchar('error_code', { length: 50 }),
    retry_count: integer('retry_count').default(0),

    // Timestamps
    sent_at: timestamp('sent_at', { withTimezone: true }),
    delivered_at: timestamp('delivered_at', { withTimezone: true }),
    failed_at: timestamp('failed_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Export types
export type NotificationDeliveryLog = typeof notificationDeliveryLogs.$inferSelect;
export type NewNotificationDeliveryLog = typeof notificationDeliveryLogs.$inferInsert;
export type DeliveryStatus = NotificationDeliveryLog['status'];
