/**
 * Collection Products Schema
 *
 * Defines the junction table for manual collections.
 * Stores the specific order (position) of products in a collection.
 */

import { pgTable, uuid, integer, primaryKey, index } from 'drizzle-orm/pg-core';
import { collections } from './collection.schema';
import { products } from '../../product/shared/product.schema';

// ============================================
// COLLECTION PRODUCTS TABLE
// ============================================

export const collectionProducts = pgTable(
  'collection_products',
  {
    collection_id: uuid('collection_id')
      .references(() => collections.id, { onDelete: 'cascade' })
      .notNull(),

    product_id: uuid('product_id')
      .references(() => products.id, { onDelete: 'cascade' })
      .notNull(),

    position: integer('position').notNull(), // Sort order
  },
  table => ({
    // Composite Primary Key
    pk: primaryKey({ columns: [table.collection_id, table.product_id] }),

    // Reverse lookup (Find all collections a product belongs to)
    productIdIdx: index('collection_products_product_id_idx').on(table.product_id),
  })
);

// Types
export type CollectionProduct = typeof collectionProducts.$inferSelect;
export type NewCollectionProduct = typeof collectionProducts.$inferInsert;
