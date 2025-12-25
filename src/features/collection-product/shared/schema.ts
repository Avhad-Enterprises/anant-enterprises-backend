import {
  pgTable,
  bigserial,
  timestamp,
  integer,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

/**
 * Collection Products Junction Schema
 * Links collections to products (many-to-many)
 */

/**
 * Collection Products Table
 * Junction table for collection membership
 */
export const collectionProducts = pgTable(
  'collection_products',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    collection_id: integer('collection_id')
      .notNull()
      .references(() => collections.id, { onDelete: 'cascade' }),
    product_id: integer('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    
    // Manual ordering (for manual collections)
    position: integer('position').default(0),
    
    // Audit fields
    created_at: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    collectionIdIdx: index('collection_products_collection_id_idx').on(table.collection_id),
    productIdIdx: index('collection_products_product_id_idx').on(table.product_id),
    collectionProductUniqueIdx: uniqueIndex('collection_products_unique_idx').on(
      table.collection_id,
      table.product_id
    ),
    positionIdx: index('collection_products_position_idx').on(table.position),
  })
);

// Export types
export type CollectionProduct = typeof collectionProducts.$inferSelect;
export type NewCollectionProduct = typeof collectionProducts.$inferInsert;

// Note: Temporary references
const collections = pgTable('collections', {
  id: integer('id').primaryKey(),
});

const products = pgTable('products', {
  id: integer('id').primaryKey(),
});
