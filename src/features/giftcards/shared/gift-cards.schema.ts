/**
 * Gift Cards Schema
 *
 * Production-ready gift card system with security, fraud prevention, and audit trails.
 * Supports digital/physical cards, partial redemption, expiry, and product restrictions.
 */

import {
    pgTable,
    uuid,
    varchar,
    text,
    boolean,
    decimal,
    integer,
    timestamp,
    pgEnum,
    jsonb,
    index,
} from 'drizzle-orm/pg-core';
import { users } from '../../user/shared/user.schema';
import { orders } from '../../orders/shared/orders.schema';

// ============================================
// ENUMS
// ============================================

export const giftCardStatusEnum = pgEnum('gift_card_status', [
    'active',
    'partially_used',
    'fully_redeemed',
    'expired',
    'suspended',
    'cancelled'
]);

export const giftCardDeliveryMethodEnum = pgEnum('gift_card_delivery_method', [
    'email',
    'physical',
    'instant'
]);

export const giftCardSourceEnum = pgEnum('gift_card_source', [
    'purchase',
    'promotion',
    'refund',
    'compensation',
    'bulk_import'
]);

// ============================================
// GIFT CARDS TABLE
// ============================================

export const giftCards = pgTable(
    'gift_cards',
    {
        // Identity & Security
        id: uuid('id').primaryKey().defaultRandom(),
        code: varchar('code', { length: 50 }).unique().notNull(), // e.g., "GIFT-ABCD-1234-EFGH"
        pin: varchar('pin', { length: 6 }), // Optional PIN for additional security

        // Financial
        initial_value: decimal('initial_value', { precision: 10, scale: 2 }).notNull(),
        current_balance: decimal('current_balance', { precision: 10, scale: 2 }).notNull(),
        currency: varchar('currency', { length: 3 }).default('INR').notNull(),

        // Status Management
        status: giftCardStatusEnum('status').default('active').notNull(),
        is_active: boolean('is_active').default(true).notNull(),

        // Ownership & Delivery
        purchaser_user_id: uuid('purchaser_user_id')
            .references(() => users.id, { onDelete: 'set null' }),
        recipient_email: varchar('recipient_email', { length: 255 }),
        recipient_name: varchar('recipient_name', { length: 255 }),
        personal_message: text('personal_message'),
        delivery_method: giftCardDeliveryMethodEnum('delivery_method').default('email'),
        delivery_scheduled_at: timestamp('delivery_scheduled_at'),

        // Restrictions & Rules
        min_order_value: decimal('min_order_value', { precision: 10, scale: 2 }), // "Valid on orders above ₹500"
        max_discount_percent: integer('max_discount_percent'), // "Can cover max 50% of order"
        applicable_product_ids: jsonb('applicable_product_ids').default([]), // Restrict to specific products
        applicable_category_ids: jsonb('applicable_category_ids').default([]), // Or specific categories
        excluded_product_ids: jsonb('excluded_product_ids').default([]), // Blacklist certain products

        // Validity
        issued_at: timestamp('issued_at').defaultNow().notNull(),
        activated_at: timestamp('activated_at'), // For delayed activation
        expires_at: timestamp('expires_at'),
        last_used_at: timestamp('last_used_at'),

        // Source Tracking
        source: giftCardSourceEnum('source').default('purchase').notNull(),
        source_order_id: uuid('source_order_id')
            .references(() => orders.id, { onDelete: 'set null' }), // CRITICAL FIX #3B
        issued_by_admin_id: uuid('issued_by_admin_id')
            .references(() => users.id, { onDelete: 'set null' }),

        // Bulk Generation
        template_id: uuid('template_id'), // FK to gift_card_templates
        batch_id: uuid('batch_id'), // Group cards generated together

        // Security & Fraud Prevention
        redemption_count: integer('redemption_count').default(0).notNull(),
        failed_attempts: integer('failed_attempts').default(0).notNull(),
        last_failed_attempt_at: timestamp('last_failed_attempt_at'),
        is_locked: boolean('is_locked').default(false).notNull(),
        locked_reason: text('locked_reason'),

        // Audit Fields
        created_by: uuid('created_by')
            .references(() => users.id, { onDelete: 'set null' }),
        created_at: timestamp('created_at').defaultNow().notNull(),
        updated_at: timestamp('updated_at').defaultNow().notNull(),
        is_deleted: boolean('is_deleted').default(false).notNull(),
        deleted_at: timestamp('deleted_at'),
        deleted_by: uuid('deleted_by')
            .references(() => users.id, { onDelete: 'set null' }),
    },
    table => ({
        // Indexes for performance
        codeIdx: index('gift_cards_code_idx').on(table.code),
        recipientEmailIdx: index('gift_cards_recipient_email_idx').on(table.recipient_email),
        statusExpiryIdx: index('gift_cards_status_expiry_idx').on(table.status, table.expires_at),
        batchIdIdx: index('gift_cards_batch_id_idx').on(table.batch_id),
        purchaserIdx: index('gift_cards_purchaser_idx').on(table.purchaser_user_id),
    })
);

// Types
export type GiftCard = typeof giftCards.$inferSelect;
export type NewGiftCard = typeof giftCards.$inferInsert;
