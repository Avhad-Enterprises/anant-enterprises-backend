/**
 * Product Tiers Schema
 *
 * Defines the Many-to-Many relationship between Products and Tiers.
 * Allows a product to belong to multiple categories.
 */

import { pgTable, uuid, boolean, primaryKey, index } from 'drizzle-orm/pg-core';
import { tiers } from './tiers.schema';
import { products } from '../../product/shared/product.schema';

// ============================================
// PRODUCT TIERS TABLE
// ============================================

export const productTiers = pgTable(
  'product_tiers',
  {
    product_id: uuid('product_id')
      .references(() => products.id, { onDelete: 'cascade' })
      .notNull(),

    tier_id: uuid('tier_id')
      .references(() => tiers.id, { onDelete: 'cascade' })
      .notNull(),

    is_primary: boolean('is_primary').default(false).notNull(), // Main category flag
  },
  table => ({
    // Composite Primary Key
    pk: primaryKey({ columns: [table.product_id, table.tier_id] }),

    // Reverse lookup (Find all products in a tier)
    tierIdIdx: index('product_tiers_tier_id_idx').on(table.tier_id),
  })
);

// Types
export type ProductTier = typeof productTiers.$inferSelect;
export type NewProductTier = typeof productTiers.$inferInsert;
