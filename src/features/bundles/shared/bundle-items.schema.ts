/**
 * Bundle Items Schema
 *
 * Defines the products included in a bundle.
 * Supports "Pick-and-Mix" logic with min/max selection.
 */

import { pgTable, uuid, boolean, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { bundles } from './bundles.schema';
import { products } from '../../product/shared/product.schema';

// ============================================
// BUNDLE ITEMS TABLE
// ============================================

export const bundleItems = pgTable(
  'bundle_items',
  {
    // Identity
    id: uuid('id').primaryKey().defaultRandom(),

    // Links
    bundle_id: uuid('bundle_id')
      .references(() => bundles.id, { onDelete: 'cascade' })
      .notNull(),
    product_id: uuid('product_id')
      .references(() => products.id, { onDelete: 'cascade' })
      .notNull(),

    // Configuration
    quantity: integer('quantity').default(1).notNull(), // "Includes 2 of these"

    // Advanced Logic (Pick-and-Mix)
    is_optional: boolean('is_optional').default(false).notNull(), // "Add for extra $?"
    min_select: integer('min_select').default(0), // For variant/group selection
    max_select: integer('max_select').default(0),
    sort_order: integer('sort_order').default(0).notNull(),

    // Audit Fields
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  table => ({
    // Indexes
    bundleIdIdx: index('bundle_items_bundle_id_idx').on(table.bundle_id),
    productIdIdx: index('bundle_items_product_id_idx').on(table.product_id),
  })
);

// Types
export type BundleItem = typeof bundleItems.$inferSelect;
export type NewBundleItem = typeof bundleItems.$inferInsert;
