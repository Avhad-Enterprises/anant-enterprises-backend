/**
 * Discount Items Schema
 *
 * Defines the links between discounts and specific items (Products, Collections).
 * This replaces the JSON arrays in the monolithic table.
 */

import { pgTable, uuid, primaryKey, index } from 'drizzle-orm/pg-core';
import { discounts } from './discount.schema';
import { products } from '../../product/shared/product.schema';
import { collections } from '../../collection/shared/collection.schema';

// ============================================
// DISCOUNT PRODUCTS (Specific Products)
// ============================================

export const discountProducts = pgTable(
  'discount_products',
  {
    discount_id: uuid('discount_id')
      .references(() => discounts.id, { onDelete: 'cascade' })
      .notNull(),

    product_id: uuid('product_id')
      .references(() => products.id, { onDelete: 'cascade' })
      .notNull(),
  },
  table => ({
    pk: primaryKey({ columns: [table.discount_id, table.product_id] }),
    productIdIdx: index('discount_products_product_id_idx').on(table.product_id),
  })
);

// ============================================
// DISCOUNT COLLECTIONS (Specific Collections)
// ============================================

export const discountCollections = pgTable(
  'discount_collections',
  {
    discount_id: uuid('discount_id')
      .references(() => discounts.id, { onDelete: 'cascade' })
      .notNull(),

    collection_id: uuid('collection_id')
      .references(() => collections.id, { onDelete: 'cascade' })
      .notNull(),
  },
  table => ({
    pk: primaryKey({ columns: [table.discount_id, table.collection_id] }),
    collectionIdIdx: index('discount_collections_collection_id_idx').on(table.collection_id),
  })
);

// Types
export type DiscountProduct = typeof discountProducts.$inferSelect;
export type DiscountCollection = typeof discountCollections.$inferSelect;
