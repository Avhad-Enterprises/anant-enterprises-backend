/**
 * Product Bundles Schema
 *
 * Defines the main bundle offer (the "container").
 * Supports Fixed Price kits and Percentage Discount sets.
 */

import {
    pgTable,
    uuid,
    varchar,
    text,
    boolean,
    decimal,
    timestamp,
    pgEnum,
    index,
} from 'drizzle-orm/pg-core';

// ============================================
// ENUMS
// ============================================

export const bundleTypeEnum = pgEnum('bundle_type', [
    'fixed_price',      // e.g. "Kit for $50"
    'percentage_discount' // e.g. "Buy together for 15% off"
]);

export const bundleStatusEnum = pgEnum('bundle_status', [
    'draft',
    'active',
    'inactive',
    'archived'
]);

// TypeScript constants for application use (Phase 1: Enum Consolidation)
export const BUNDLE_STATUSES = bundleStatusEnum.enumValues;
export type BundleStatus = typeof BUNDLE_STATUSES[number];


// ============================================
// BUNDLES TABLE
// ============================================

export const bundles = pgTable(
    'bundles',
    {
        // Identity
        id: uuid('id').primaryKey().defaultRandom(),

        // Content
        title: varchar('title', { length: 255 }).notNull(),
        description: text('description'),
        image_url: text('image_url'),

        // Logic
        type: bundleTypeEnum('type').default('fixed_price').notNull(),
        status: bundleStatusEnum('status').default('draft').notNull(),

        // Pricing
        // If type='fixed_price', this is the total price (e.g., 50.00)
        // If type='percentage_discount', this is the % off (e.g., 15.00)
        price_value: decimal('price_value', { precision: 10, scale: 2 }),

        // Validity
        starts_at: timestamp('starts_at'),
        ends_at: timestamp('ends_at'),

        // Audit Fields
        created_by: uuid('created_by'),
        created_at: timestamp('created_at').defaultNow().notNull(),
        updated_by: uuid('updated_by'),
        updated_at: timestamp('updated_at').defaultNow().notNull(),
        is_deleted: boolean('is_deleted').default(false).notNull(),
        deleted_by: uuid('deleted_by'),
        deleted_at: timestamp('deleted_at'),
    },
    table => ({
        // Indexes
        statusIdx: index('bundles_status_idx').on(table.status),
        validityIdx: index('bundles_validity_idx').on(table.starts_at, table.ends_at),
    })
);

// Types
export type Bundle = typeof bundles.$inferSelect;
export type NewBundle = typeof bundles.$inferInsert;
