/**
 * Carts Schema
 *
 * Shopping cart container with support for logged-in users and guest sessions.
 * Tracks totals, discounts, gift cards, and abandoned cart status.
 */

import {
    pgTable,
    uuid,
    varchar,
    integer,
    decimal,
    boolean,
    timestamp,
    pgEnum,
    jsonb,
    index,
} from 'drizzle-orm/pg-core';
import { users } from '../../user/shared/user.schema';

// ============================================
// ENUMS
// ============================================

export const cartStatusEnum = pgEnum('cart_status', [
    'active',
    'converted',
    'abandoned'
]);

export const cartSourceEnum = pgEnum('cart_source', [
    'web',
    'app'
]);

// ============================================
// CARTS TABLE
// ============================================

export const carts = pgTable(
    'carts',
    {
        // Identity
        id: uuid('id').primaryKey().defaultRandom(),

        // User Association (either user_id OR session_id)
        user_id: integer('user_id')
            .references(() => users.id, { onDelete: 'set null' }),
        session_id: varchar('session_id', { length: 100 }), // For guest users

        // Financial Breakdown
        currency: varchar('currency', { length: 3 }).default('INR').notNull(),
        subtotal: decimal('subtotal', { precision: 12, scale: 2 }).default('0.00').notNull(),
        discount_total: decimal('discount_total', { precision: 12, scale: 2 }).default('0.00').notNull(),
        giftcard_total: decimal('giftcard_total', { precision: 12, scale: 2 }).default('0.00').notNull(),
        shipping_total: decimal('shipping_total', { precision: 12, scale: 2 }).default('0.00').notNull(),
        tax_total: decimal('tax_total', { precision: 12, scale: 2 }).default('0.00').notNull(),
        grand_total: decimal('grand_total', { precision: 12, scale: 2 }).default('0.00').notNull(),

        // Applied Discounts & Gift Cards (for reference)
        applied_discount_codes: jsonb('applied_discount_codes').default([]),
        applied_giftcard_codes: jsonb('applied_giftcard_codes').default([]),

        // Status & Source
        cart_status: cartStatusEnum('cart_status').default('active').notNull(),
        source: cartSourceEnum('source').default('web').notNull(),

        // Abandoned Cart Tracking
        last_activity_at: timestamp('last_activity_at').defaultNow().notNull(),
        abandoned_at: timestamp('abandoned_at'),
        recovery_email_sent: boolean('recovery_email_sent').default(false).notNull(),
        recovery_email_sent_at: timestamp('recovery_email_sent_at'),

        // Audit Fields
        created_at: timestamp('created_at').defaultNow().notNull(),
        updated_at: timestamp('updated_at').defaultNow().notNull(),
        is_deleted: boolean('is_deleted').default(false).notNull(),
        deleted_at: timestamp('deleted_at'),
        created_by: integer('created_by')
            .references(() => users.id, { onDelete: 'set null' }),
        updated_by: integer('updated_by')
            .references(() => users.id, { onDelete: 'set null' }),
        deleted_by: integer('deleted_by')
            .references(() => users.id, { onDelete: 'set null' }),
    },
    table => ({
        // Indexes
        userIdIdx: index('carts_user_id_idx').on(table.user_id),
        sessionIdIdx: index('carts_session_id_idx').on(table.session_id),
        statusActivityIdx: index('carts_status_activity_idx').on(table.cart_status, table.last_activity_at),
    })
);

// Types
export type Cart = typeof carts.$inferSelect;
export type NewCart = typeof carts.$inferInsert;
