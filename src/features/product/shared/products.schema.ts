/**
 * Products Schema
 *
 * Defines the main products table and product status enum.
 * Core entity for the e-commerce system.
 */

import {
    pgTable,
    uuid,
    varchar,
    text,
    decimal,
    boolean,
    timestamp,
    jsonb,
    pgEnum,
    index,
    check,
    customType,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { tiers } from '../../tiers/shared/tiers.schema';

// Custom types
const tsvector = customType<{ data: string }>({
    dataType() {
        return 'tsvector';
    },
});

// ============================================
// ENUMS
// ============================================

export const productStatusEnum = pgEnum('product_status', [
    'draft',
    'active',
    'archived',
]);

// ============================================
// PRODUCTS TABLE
// ============================================

/**
 * Products table
 * Core entity for the e-commerce system.
 */
export const products = pgTable(
    'products',
    {
        // Identity
        id: uuid('id').primaryKey().default(sql`uuid_generate_v7()`),
        slug: varchar('slug', { length: 255 }).unique().notNull(),
        product_title: varchar('product_title', { length: 255 }).notNull(),
        secondary_title: varchar('secondary_title', { length: 255 }),

        // Content
        short_description: text('short_description'),
        full_description: text('full_description'), // Rich Text / HTML

        // Status & Availability
        status: productStatusEnum('status').default('draft').notNull(),
        featured: boolean('featured').default(false).notNull(), // Featured product flag

        // Pricing
        cost_price: decimal('cost_price', { precision: 15, scale: 2 }).default('0.00').notNull(),
        selling_price: decimal('selling_price', { precision: 15, scale: 2 }).default('0.00').notNull(),
        compare_at_price: decimal('compare_at_price', { precision: 15, scale: 2 }), // Nullable

        // Inventory & Logistics
        sku: varchar('sku', { length: 100 }).unique().notNull(),
        hsn_code: varchar('hsn_code', { length: 20 }),
        barcode: varchar('barcode', { length: 50 }),
        // CRITICAL FIX #7: Removed inventory_quantity - use inventory table instead
        // Query: SELECT SUM(available_quantity) FROM inventory WHERE product_id = ?

        // Physical dimensions
        weight: decimal('weight', { precision: 8, scale: 2 }), // kg
        length: decimal('length', { precision: 8, scale: 2 }), // cm
        breadth: decimal('breadth', { precision: 8, scale: 2 }), // cm
        height: decimal('height', { precision: 8, scale: 2 }), // cm

        // Categorization
        // Hierarchical category structure using tiers table
        category_tier_1: uuid('category_tier_1').references(() => tiers.id, { onDelete: 'set null' }),
        category_tier_2: uuid('category_tier_2').references(() => tiers.id, { onDelete: 'set null' }),
        category_tier_3: uuid('category_tier_3').references(() => tiers.id, { onDelete: 'set null' }),
        category_tier_4: uuid('category_tier_4').references(() => tiers.id, { onDelete: 'set null' }),

        // Tags
        tags: jsonb('tags').default([]), // ["tag1", "tag2"]

        // Media
        primary_image_url: text('primary_image_url'),
        thumbnail_url: text('thumbnail_url'),
        additional_images: jsonb('additional_images').default([]), // Array of URLs
        additional_thumbnails: jsonb('additional_thumbnails').default([]), // Array of URLs

        // Variants Flag
        has_variants: boolean('has_variants').default(false).notNull(),

        // SEO
        meta_title: varchar('meta_title', { length: 255 }),
        meta_description: text('meta_description'),
        product_url: varchar('product_url', { length: 500 }), // Custom product URL

        // Audit Fields
        created_at: timestamp('created_at').defaultNow().notNull(),
        updated_at: timestamp('updated_at').defaultNow().notNull(),
        created_by: uuid('created_by'),
        updated_by: uuid('updated_by'),

        // Soft Delete
        is_deleted: boolean('is_deleted').default(false).notNull(),
        deleted_at: timestamp('deleted_at'),
        deleted_by: uuid('deleted_by'),

        // Search Optimization
        // Full-text search vector combining title and description
        // Enables fast, ranked search results with PostgreSQL text search
        search_vector: tsvector('search_vector').generatedAlwaysAs(
            sql`to_tsvector('english', 
                    COALESCE(product_title, '') || ' ' || 
                    COALESCE(short_description, '')
                )`
        ),
    },
    table => ({
        // EXISTING INDEXES - Basic lookups
        slugIdx: index('products_slug_idx').on(table.slug),
        skuIdx: index('products_sku_idx').on(table.sku),
        statusIdx: index('products_status_idx').on(table.status),
        categoryIdx: index('products_category_idx').on(table.category_tier_1, table.category_tier_2),

        // PHASE 3 BATCH 1: SEARCH OPTIMIZATION INDEXES

        // Full-text search index (GIN)
        // Enables fast text search queries on product_title + description + brand
        // Requires: CREATE EXTENSION IF NOT EXISTS pg_trgm; (applied via migration)
        searchVectorIdx: index('products_search_vector_idx').using('gin', table.search_vector),

        // Fuzzy search index on product title (pg_trgm)
        // Enables typo-tolerant search: "water purifer" finds "water purifier"
        // Supports ILIKE, similarity(), and <-> operators
        // TODO: Fix SyntaxError: "undefined" is not valid JSON during tests with Drizzle/PG-TRGM
        // titleTrgmIdx: index('products_title_trgm_idx').using(
        //     'gin',
        //     sql`${table.product_title} gin_trgm_ops`
        // ),

        // JSONB tag search index (GIN)
        // Enables fast filtering by product tags: ["RO", "UV", "UF"]
        // Supports: tags @> '["RO"]' queries
        tagsIdx: index('products_tags_idx').using('gin', table.tags),

        // Price range index (B-tree)
        // Optimizes price filtering and sorting queries
        // Supports: WHERE selling_price BETWEEN x AND y
        priceIdx: index('products_price_idx').on(table.selling_price),

        // Composite index for common filter combinations
        // Optimizes: category + price range + status filtering (e-commerce standard)
        // Example query: Browse Water Purifiers, price $100-$500, active only
        categoryPriceStatusIdx: index('products_category_price_status_idx').on(
            table.category_tier_1,
            table.selling_price,
            table.status,
            table.is_deleted
        ),

        // Soft delete index
        // Optimizes queries filtering out deleted products
        isDeletedIdx: index('products_is_deleted_idx').on(table.is_deleted),

        // PHASE 3 BATCH 5: CHECK CONSTRAINTS (Data Validation)

        // Ensure prices are non-negative
        costPriceCheck: check('products_cost_price_check', sql`cost_price >= 0`),

        sellingPriceCheck: check('products_selling_price_check', sql`selling_price >= 0`),

        // Compare price must be higher than selling price (if set)
        compareAtPriceCheck: check(
            'products_compare_at_price_check',
            sql`compare_at_price IS NULL OR compare_at_price >= selling_price`
        ),
    })
);

// Types
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
