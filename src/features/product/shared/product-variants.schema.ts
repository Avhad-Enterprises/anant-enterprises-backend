/**
 * Product Variants Schema
 *
 * Defines the sub-table for product variations (size, color, etc.).
 */

import {
    pgTable,
    uuid,
    varchar,
    text,
    decimal,
    integer,
    boolean,
    timestamp,
    index,
} from 'drizzle-orm/pg-core';
import { products } from './product.schema';

// ============================================
// PRODUCT VARIANTS TABLE
// ============================================

export const productVariants = pgTable(
    'product_variants',
    {
        id: uuid('id').primaryKey().defaultRandom(),

        // Parent Link
        product_id: uuid('product_id')
            .references(() => products.id, { onDelete: 'cascade' })
            .notNull(),

        // HIGH PRIORITY FIX #12: Variant Details
        variant_name: varchar('variant_name', { length: 100 }).notNull(), // e.g., "Size", "Color"
        variant_value: varchar('variant_value', { length: 100 }).notNull(), // e.g., "Large", "Red"

        // Variant-specific fields
        sku: varchar('sku', { length: 100 }).unique(), // Variant-specific SKU
        price_adjustment: decimal('price_adjustment', { precision: 10, scale: 2 }).default('0.00'), // +/- from base price
        inventory_quantity: integer('inventory_quantity').default(0), // Variant-specific inventory
        is_default: boolean('is_default').default(false).notNull(), // Default variant for product

        // Media
        image_url: text('image_url'),

        // Audit Fields
        is_active: boolean('is_active').default(true).notNull(),
        created_at: timestamp('created_at').defaultNow().notNull(),
        updated_at: timestamp('updated_at').defaultNow().notNull(),
    },
    table => ({
        // Lookup variants by product
        productIdIdx: index('product_variants_product_id_idx').on(table.product_id),
        // Fast SKU lookup
        skuIdx: index('product_variants_sku_idx').on(table.sku),
    })
);

// Types
export type ProductVariant = typeof productVariants.$inferSelect;
export type NewProductVariant = typeof productVariants.$inferInsert;
