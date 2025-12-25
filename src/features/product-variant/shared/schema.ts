import {
  pgTable,
  serial,
  bigserial,
  timestamp,
  boolean,
  integer,
  varchar,
  decimal,
  index,
  uniqueIndex,
  pgEnum,
} from 'drizzle-orm/pg-core';

/**
 * Product Variants Schema
 * Handles SKU-level variations (size, color, etc.) with independent pricing and inventory
 */

// Enums
export const variantStatusEnum = pgEnum('variant_status', ['active', 'inactive', 'discontinued']);

/**
 * Product Variants Table
 * Each variant represents a unique SKU (e.g., T-Shirt - Large - Red)
 */
export const productVariants = pgTable(
  'product_variants',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    product_id: integer('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
    
    // SKU & Identification
    sku: varchar('sku', { length: 100 }).notNull().unique(),
    barcode: varchar('barcode', { length: 50 }),
    
    // Pricing
    cost_price: decimal('cost_price', { precision: 12, scale: 2 }).default('0.00'),
    selling_price: decimal('selling_price', { precision: 12, scale: 2 }).notNull(),
    compare_at_price: decimal('compare_at_price', { precision: 12, scale: 2 }),
    
    // Physical attributes
    weight: decimal('weight', { precision: 8, scale: 2 }),
    length: decimal('length', { precision: 8, scale: 2 }),
    width: decimal('width', { precision: 8, scale: 2 }),
    height: decimal('height', { precision: 8, scale: 2 }),
    
    // Variant info
    title: varchar('title', { length: 255 }),
    is_default: boolean('is_default').default(false),
    position: integer('position').default(0),
    status: variantStatusEnum('status').default('active'),
    
    // Images
    image_url: varchar('image_url', { length: 500 }),
    
    // Audit fields
    created_by: integer('created_by'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_by: integer('updated_by'),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
    is_deleted: boolean('is_deleted').default(false).notNull(),
    deleted_by: integer('deleted_by'),
    deleted_at: timestamp('deleted_at'),
  },
  (table) => ({
    productIdIdx: index('product_variants_product_id_idx').on(table.product_id),
    skuUniqueIdx: uniqueIndex('product_variants_sku_unique_idx').on(table.sku),
    statusIdx: index('product_variants_status_idx').on(table.status),
    isDefaultIdx: index('product_variants_is_default_idx').on(table.is_default),
  })
);

// Export types
export type ProductVariant = typeof productVariants.$inferSelect;
export type NewProductVariant = typeof productVariants.$inferInsert;

// Note: Temporary reference - will be properly linked when products table is created
const products = pgTable('products', {
  id: serial('id').primaryKey(),
});
