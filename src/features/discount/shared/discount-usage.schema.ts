/**
 * Discount Usage Schema
 *
 * Tracks individual discount usages for:
 * - Usage limit enforcement
 * - Analytics and reporting
 * - Audit trail
 */

import {
    pgTable,
    uuid,
    varchar,
    decimal,
    timestamp,
    index,
    integer,
} from 'drizzle-orm/pg-core';
import { discounts } from './discount.schema';
import { discountCodes } from './discount-codes.schema';
import { users } from '../../user/shared/user.schema';
import { orders } from '../../orders/shared/orders.schema';

// ============================================
// DISCOUNT USAGE TABLE
// ============================================

export const discountUsage = pgTable(
    'discount_usage',
    {
        id: uuid('id').primaryKey().defaultRandom(),

        // Discount reference
        discount_id: uuid('discount_id')
            .references(() => discounts.id, { onDelete: 'set null' }),
        discount_code: varchar('discount_code', { length: 50 })
            .references(() => discountCodes.code, { onDelete: 'set null' }),

        // User reference (nullable for guest checkouts)
        user_id: uuid('user_id')
            .references(() => users.id, { onDelete: 'set null' }),
        guest_email: varchar('guest_email', { length: 255 }), // For guest checkout tracking

        // Order reference
        order_id: uuid('order_id')
            .references(() => orders.id, { onDelete: 'set null' }),
        order_number: varchar('order_number', { length: 40 }), // Denormalized for easy lookup

        // Discount details at time of use
        discount_type: varchar('discount_type', { length: 30 }).notNull(), // percentage, fixed_amount, etc.
        discount_value: decimal('discount_value', { precision: 10, scale: 2 }), // The discount percentage or amount
        discount_amount: decimal('discount_amount', { precision: 12, scale: 2 }).notNull(), // Actual amount discounted

        // Order context
        order_subtotal: decimal('order_subtotal', { precision: 12, scale: 2 }),
        order_total: decimal('order_total', { precision: 12, scale: 2 }),
        items_count: integer('items_count'),

        // Timestamps
        used_at: timestamp('used_at').defaultNow().notNull(),
    },
    table => ({
        // Performance indexes
        discountIdIdx: index('discount_usage_discount_id_idx').on(table.discount_id),
        discountCodeIdx: index('discount_usage_discount_code_idx').on(table.discount_code),
        userIdIdx: index('discount_usage_user_id_idx').on(table.user_id),
        orderIdIdx: index('discount_usage_order_id_idx').on(table.order_id),
        usedAtIdx: index('discount_usage_used_at_idx').on(table.used_at),

        // Composite index for usage checking
        userDiscountIdx: index('discount_usage_user_discount_idx').on(table.user_id, table.discount_id),
        userCodeIdx: index('discount_usage_user_code_idx').on(table.user_id, table.discount_code),
    })
);

// ============================================
// DISCOUNT DAILY USAGE (For per-day limits)
// ============================================

export const discountDailyUsage = pgTable(
    'discount_daily_usage',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        discount_id: uuid('discount_id')
            .references(() => discounts.id, { onDelete: 'cascade' })
            .notNull(),
        usage_date: timestamp('usage_date').notNull(), // Date only (time set to 00:00:00)
        usage_count: integer('usage_count').default(0).notNull(),
    },
    table => ({
        // Unique constraint for discount + date
        discountDateIdx: index('discount_daily_usage_discount_date_idx').on(
            table.discount_id,
            table.usage_date
        ),
    })
);

// ============================================
// TYPES
// ============================================

export type DiscountUsage = typeof discountUsage.$inferSelect;
export type NewDiscountUsage = typeof discountUsage.$inferInsert;
export type DiscountDailyUsage = typeof discountDailyUsage.$inferSelect;
export type NewDiscountDailyUsage = typeof discountDailyUsage.$inferInsert;
