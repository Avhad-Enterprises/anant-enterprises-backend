/**
 * Product Variants Schema
 *
 * Defines the product_variants table for storing product variations.
 * Examples: Size (Small, Medium, Large), Color (Red, Blue, Green)
 * 
 * PHASE 2A: Inventory tracking moved to inventory table (variant_id FK)
 * Query inventory: SELECT SUM(available_quantity) FROM inventory WHERE variant_id = ?
 */

import {
    pgTable,
    uuid,
    varchar,
    text,
    decimal,
    boolean,
    timestamp,
    index,
    check,
    unique,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { products } from './products.schema';

// ============================================
// PRODUCT VARIANTS TABLE
// ============================================

/**
 * Product Variants table
 * Stores variant options for products (e.g., Size: Large, Color: Red)
 */
export const productVariants = pgTable(
    'product_variants',
    {
        // Identity
        id: uuid('id').primaryKey().defaultRandom(),
        product_id: uuid('product_id')
            .references(() => products.id, { onDelete: 'cascade' })
            .notNull(),

        // Variant Attributes
        option_name: varchar('option_name', { length: 100 }).notNull(),
        option_value: varchar('option_value', { length: 100 }).notNull(),

        // Identification
        sku: varchar('sku', { length: 100 }).unique().notNull(),
        barcode: varchar('barcode', { length: 50 }),

        // Independent Pricing (not adjustment-based)
        cost_price: decimal('cost_price', { precision: 15, scale: 2 })
            .default('0.00')
            .notNull(),
        selling_price: decimal('selling_price', { precision: 15, scale: 2 }).notNull(),
        compare_at_price: decimal('compare_at_price', { precision: 15, scale: 2 }),

        // PHASE 2A: inventory_quantity REMOVED
        // Use inventory table instead: SELECT * FROM inventory WHERE variant_id = ?

        // Media
        image_url: text('image_url'),
        thumbnail_url: text('thumbnail_url'),

        // Status
        is_default: boolean('is_default').default(false).notNull(),
        is_active: boolean('is_active').default(true).notNull(),

        // Audit Fields
        created_at: timestamp('created_at').defaultNow().notNull(),
        updated_at: timestamp('updated_at').defaultNow().notNull(),
        created_by: uuid('created_by'),
        updated_by: uuid('updated_by'),

        // Soft Delete
        is_deleted: boolean('is_deleted').default(false).notNull(),
        deleted_at: timestamp('deleted_at'),
        deleted_by: uuid('deleted_by'),
    },
    (table) => ({
        // Indexes
        productIdIdx: index('product_variants_product_id_idx').on(table.product_id),
        skuIdx: index('product_variants_sku_idx').on(table.sku),
        isDeletedIdx: index('product_variants_is_deleted_idx').on(table.is_deleted),

        // PHASE 1: Unique constraint to prevent duplicate variants
        uq_variant_option: unique('uq_variant_option').on(table.product_id, table.option_name, table.option_value),

        // Check Constraints
        costPriceCheck: check(
            'product_variants_cost_price_check',
            sql`cost_price >= 0`
        ),
        sellingPriceCheck: check(
            'product_variants_selling_price_check',
            sql`selling_price >= 0`
        ),
        compareAtPriceCheck: check(
            'product_variants_compare_at_price_check',
            sql`compare_at_price IS NULL OR compare_at_price >= selling_price`
        ),
    })
);

// Variant Types
export type ProductVariant = typeof productVariants.$inferSelect;
export type NewProductVariant = typeof productVariants.$inferInsert;
