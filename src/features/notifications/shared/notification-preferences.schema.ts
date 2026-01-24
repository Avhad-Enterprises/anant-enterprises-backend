import { pgTable, uuid, boolean, time, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from '../../user';
import { notificationTypeEnum } from './notifications.schema';

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
 * Notification Preferences Table
 * User-specific notification settings
 */
export const notificationPreferences = pgTable('notification_preferences', {
    id: uuid('id').primaryKey().default(sql`uuid_generate_v7()`),
    user_id: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    notification_type: notificationTypeEnum('notification_type').notNull(),

    // Channel preferences
    channel_email: boolean('channel_email').default(true).notNull(),
    channel_sms: boolean('channel_sms').default(false).notNull(),
    channel_in_app: boolean('channel_in_app').default(true).notNull(),
    channel_push: boolean('channel_push').default(true).notNull(),

    // Frequency
    frequency: notificationFrequencyEnum('frequency').default('immediate').notNull(),

    // Quiet hours (do not disturb)
    quiet_hours_enabled: boolean('quiet_hours_enabled').default(false).notNull(),
    quiet_hours_start: time('quiet_hours_start'),
    quiet_hours_end: time('quiet_hours_end'),

    // Timestamps
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Export types
export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type NewNotificationPreference = typeof notificationPreferences.$inferInsert;
export type NotificationFrequency = NotificationPreference['frequency'];
