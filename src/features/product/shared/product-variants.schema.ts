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

        // Variation Details
        option_name: varchar('option_name', { length: 50 }).notNull(), // e.g. "Size", "Color"
        option_value: varchar('option_value', { length: 50 }).notNull(), // e.g. "Small", "Red"

        // Inventory & Commerce Overrides
        sku: varchar('sku', { length: 100 }).unique().notNull(), // Specific SKU for this variant
        price: decimal('price', { precision: 10, scale: 2 }), // Nullable override
        inventory_quantity: integer('inventory_quantity').default(0).notNull(),

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
