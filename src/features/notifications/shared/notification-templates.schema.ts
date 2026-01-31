import { pgTable, uuid, varchar, text, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/**
 * Notification Templates Table
 * Stores reusable notification templates with variable substitution
 */
export const notificationTemplates = pgTable('notification_templates', {
    id: uuid('id').primaryKey().default(sql`uuid_generate_v7()`),

    // Template identification
    code: varchar('code', { length: 100 }).notNull().unique(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    category: varchar('category', { length: 50 }),

    // Email templates
    subject: varchar('subject', { length: 255 }),
    body_text: text('body_text'),
    body_html: text('body_html'),

    // SMS template
    sms_template: text('sms_template'),

    // In-app notification template
    in_app_title: varchar('in_app_title', { length: 255 }),
    in_app_message: text('in_app_message'),

    // Available variables for substitution (e.g., ["userName", "orderNumber"])
    variables: jsonb('variables').$type<string[]>().default([]),

    // Status
    is_active: boolean('is_active').default(true).notNull(),

    // Timestamps
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Export types
export type NotificationTemplate = typeof notificationTemplates.$inferSelect;
export type NewNotificationTemplate = typeof notificationTemplates.$inferInsert;
