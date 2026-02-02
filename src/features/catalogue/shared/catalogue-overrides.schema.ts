/*
 * ⚠️ UNUSED TABLE - COMMENTED OUT (31 Jan 2026)
 * See catalogue.schema.ts for details
 */

/**
 * Catalogue Product Overrides Schema
 *
 * Defines granular overrides for specific products in a catalogue.
 * Used for specific pricing, quantity limits, or exclusion.
 */

import {
  pgTable,
  uuid,
  decimal,
  integer,
  boolean,
  pgEnum,
  primaryKey,
  index,
} from 'drizzle-orm/pg-core';
import { catalogues } from './catalogue.schema';
import { products } from '../../product/shared/products.schema';

// ============================================
// ENUMS
// ============================================

export const catalogueAdjustmentTypeEnum = pgEnum('catalogue_adjustment_type', [
  'fixed_price',
  'percentage_discount',
  'percentage_markup',
  'fixed_discount',
]);

// ============================================
// CATALOGUE PRODUCT OVERRIDES TABLE
// ============================================

export const catalogueProductOverrides = pgTable(
  'catalogue_product_overrides',
  {
    // Links
    catalogue_id: uuid('catalogue_id')
      .references(() => catalogues.id, { onDelete: 'cascade' })
      .notNull(),

    product_id: uuid('product_id')
      .references(() => products.id, { onDelete: 'cascade' })
      .notNull(),

    // Pricing Adjustment
    adjustment_type: catalogueAdjustmentTypeEnum('adjustment_type').default('fixed_price'),
    adjustment_value: decimal('adjustment_value', { precision: 10, scale: 2 }),

    // Quantity Controls (B2B)
    min_quantity: integer('min_quantity'),
    max_quantity: integer('max_quantity'),
    increment_step: integer('increment_step').default(1),

    // Visibility Control
    is_excluded: boolean('is_excluded').default(false).notNull(), // Hide even if it matches rules
  },
  table => ({
    // Composite PK
    pk: primaryKey({ columns: [table.catalogue_id, table.product_id] }),
    // Index for finding overrides for a specific product
    productIdIdx: index('catalogue_overrides_product_id_idx').on(table.product_id),
  })
);

// Types
export type CatalogueProductOverride = typeof catalogueProductOverrides.$inferSelect;
export type NewCatalogueProductOverride = typeof catalogueProductOverrides.$inferInsert;
