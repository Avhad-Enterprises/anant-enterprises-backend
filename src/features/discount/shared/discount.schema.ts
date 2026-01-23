/**
 * Discount Schema
 *
 * Defines the core discount campaigns with full support for:
 * - Percentage and fixed amount discounts
 * - Buy X Get Y promotions
 * - Free shipping offers
 * - Customer targeting and geo-restrictions
 * - Usage limits and scheduling
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
  jsonb,
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

// New enums for extended features
export const discountAppliesToEnum = pgEnum('discount_applies_to', [
  'entire_order',
  'specific_products',
  'specific_collections',
]);

export const buyXTriggerTypeEnum = pgEnum('buy_x_trigger_type', [
  'quantity',
  'amount',
]);

export const getYTypeEnum = pgEnum('get_y_type', [
  'free',
  'percentage',
  'amount',
  'fixed_price',
]);

export const getYAppliesToEnum = pgEnum('get_y_applies_to', [
  'same',
  'specific_products',
  'specific_collections',
  'cheapest',
]);

export const shippingScopeEnum = pgEnum('shipping_scope', [
  'all',
  'specific_methods',
  'specific_zones',
]);

export const targetAudienceEnum = pgEnum('target_audience', [
  'all',
  'specific_customers',
  'segments',
]);

export const geoRestrictionEnum = pgEnum('geo_restriction', [
  'none',
  'specific_regions',
]);

// ============================================
// DISCOUNTS TABLE
// ============================================

export const discounts = pgTable(
  'discounts',
  {
    // Identity
    id: uuid('id').primaryKey().default(sql`uuid_generate_v7()`),
    title: varchar('title', { length: 255 }).notNull(), // Internal Label
    description: varchar('description', { length: 500 }),

    // Core Logic
    type: discountTypeEnum('type').notNull(),
    value: decimal('value', { precision: 10, scale: 2 }), // Percentage (10.00) or Amount (10.00)
    max_discount_amount: decimal('max_discount_amount', { precision: 10, scale: 2 }), // Cap for percentage discounts

    // Applies To (for percentage/fixed discounts)
    applies_to: discountAppliesToEnum('applies_to').default('entire_order').notNull(),

    // Minimum Requirements
    min_requirement_type: minRequirementTypeEnum('min_requirement_type').default('none').notNull(),
    min_requirement_value: decimal('min_requirement_value', { precision: 10, scale: 2 }),

    // ============================================
    // BUY X GET Y CONFIGURATION
    // ============================================
    // Customer Buys X
    buy_x_trigger_type: buyXTriggerTypeEnum('buy_x_trigger_type'),
    buy_x_value: decimal('buy_x_value', { precision: 10, scale: 2 }), // Quantity or amount to trigger
    buy_x_applies_to: discountAppliesToEnum('buy_x_applies_to'), // any, specific_products, specific_collections
    buy_x_same_product: boolean('buy_x_same_product').default(false),
    buy_x_repeat: boolean('buy_x_repeat').default(true), // Apply multiple times in one order

    // Customer Gets Y
    get_y_type: getYTypeEnum('get_y_type'), // free, percentage, amount, fixed_price
    get_y_applies_to: getYAppliesToEnum('get_y_applies_to'), // same, specific_products, specific_collections, cheapest
    get_y_quantity: integer('get_y_quantity'), // Number of reward items
    get_y_value: decimal('get_y_value', { precision: 10, scale: 2 }), // Discount value for non-free rewards
    get_y_max_rewards: integer('get_y_max_rewards'), // Max rewards per order

    // ============================================
    // FREE SHIPPING CONFIGURATION
    // ============================================
    shipping_scope: shippingScopeEnum('shipping_scope'),
    shipping_min_amount: decimal('shipping_min_amount', { precision: 10, scale: 2 }),
    shipping_min_items: integer('shipping_min_items'),
    shipping_cap: decimal('shipping_cap', { precision: 10, scale: 2 }), // Max shipping discount

    // ============================================
    // TARGETING & ELIGIBILITY
    // ============================================
    target_audience: targetAudienceEnum('target_audience').default('all').notNull(),
    geo_restriction: geoRestrictionEnum('geo_restriction').default('none').notNull(),

    // ============================================
    // USAGE LIMITS
    // ============================================
    usage_limit: integer('usage_limit'), // Global limit (e.g. first 100 people)
    usage_per_customer: integer('usage_per_customer'), // Max uses per customer
    usage_per_day: integer('usage_per_day'), // Daily limit
    usage_per_order: integer('usage_per_order'), // Per-order limit (for stackable scenarios)
    once_per_customer: boolean('once_per_customer').default(false).notNull(),
    limit_new_customers: boolean('limit_new_customers').default(false).notNull(),
    limit_returning_customers: boolean('limit_returning_customers').default(false).notNull(),

    // ============================================
    // SCHEDULE
    // ============================================
    starts_at: timestamp('starts_at').notNull(),
    ends_at: timestamp('ends_at'),

    // ============================================
    // STATUS & STATISTICS
    // ============================================
    status: discountStatusEnum('status').default('draft').notNull(),
    total_usage_count: integer('total_usage_count').default(0).notNull(),
    total_discount_amount: decimal('total_discount_amount', { precision: 12, scale: 2 }).default('0').notNull(),
    total_orders_count: integer('total_orders_count').default(0).notNull(),

    // ============================================
    // METADATA
    // ============================================
    tags: jsonb('tags').default([]),
    admin_comment: varchar('admin_comment', { length: 500 }),

    // ============================================
    // AUDIT FIELDS
    // ============================================
    is_deleted: boolean('is_deleted').default(false).notNull(),
    created_by: uuid('created_by'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
    deleted_at: timestamp('deleted_at'),
    deleted_by: uuid('deleted_by'),
  },
  table => ({
    // Optimizing Lookups
    statusIdx: index('discounts_status_idx').on(table.status),
    typeIdx: index('discounts_type_idx').on(table.type),
    datesIdx: index('discounts_dates_idx').on(table.starts_at, table.ends_at),
    deletedIdx: index('discounts_is_deleted_idx').on(table.is_deleted),

    // Composite index for finding active discounts
    activeDiscountsIdx: index('discounts_active_idx').on(table.status, table.is_deleted, table.starts_at, table.ends_at),

    // CHECK CONSTRAINTS
    // Ensure end date is after start date (if set)
    datesCheck: check('discounts_dates_check', sql`ends_at IS NULL OR ends_at > starts_at`),

    // Ensure value is set for percentage/fixed discounts
    valueCheck: check('discounts_value_check', sql`
      (type IN ('free_shipping', 'buy_x_get_y')) OR 
      (type IN ('percentage', 'fixed_amount') AND value IS NOT NULL)
    `),
  })
);

// Types
export type Discount = typeof discounts.$inferSelect;
export type NewDiscount = typeof discounts.$inferInsert;
