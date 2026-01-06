/**
 * Discount Schema
 *
 * Defines the core discount campaigns.
 */

import {
  pgTable,
  uuid,
  varchar,
  decimal,
  timestamp,
  pgEnum,
  integer,
  boolean,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ============================================
// ENUMS
// ============================================

export const discountTypeEnum = pgEnum('discount_type', [
  'percentage',
  'fixed_amount',
  'free_shipping',
  'buy_x_get_y',
]);

export const discountStatusEnum = pgEnum('discount_status', [
  'active',
  'inactive',
  'draft',
  'scheduled',
  'expired',
]);

export const minRequirementTypeEnum = pgEnum('discount_min_requirement_type', [
  'none',
  'min_amount',
  'min_quantity',
]);

// ============================================
// DISCOUNTS TABLE
// ============================================

export const discounts = pgTable(
  'discounts',
  {
    // Identity
    id: uuid('id').primaryKey().defaultRandom(),
    title: varchar('title', { length: 255 }).notNull(), // Internal Label

    // Core Logic
    type: discountTypeEnum('type').notNull(),
    value: decimal('value', { precision: 10, scale: 2 }), // Percentage (10.00) or Amount (10.00)

    // Restrictions
    min_requirement_type: minRequirementTypeEnum('min_requirement_type').default('none').notNull(),
    min_requirement_value: decimal('min_requirement_value', { precision: 10, scale: 2 }),

    usage_limit: integer('usage_limit'), // Global limit (e.g. first 100 people)
    once_per_customer: boolean('once_per_customer').default(false).notNull(),

    // Schedule
    starts_at: timestamp('starts_at').notNull(),
    ends_at: timestamp('ends_at'),

    // Status
    status: discountStatusEnum('status').default('draft').notNull(),

    // Audit Fields
    is_deleted: boolean('is_deleted').default(false).notNull(),
    created_by: uuid('created_by'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  table => ({
    // Optimizing Lookups
    statusIdx: index('discounts_status_idx').on(table.status),
    typeIdx: index('discounts_type_idx').on(table.type),
    datesIdx: index('discounts_dates_idx').on(table.starts_at, table.ends_at),

    // PHASE 3 BATCH 5: CHECK CONSTRAINTS
    // Ensure end date is after start date (if set)
    datesCheck: check('discounts_dates_check', sql`ends_at IS NULL OR ends_at > starts_at`),
  })
);

// Types
export type Discount = typeof discounts.$inferSelect;
export type NewDiscount = typeof discounts.$inferInsert;
