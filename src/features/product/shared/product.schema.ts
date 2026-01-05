/**
 * Product Schema
 *
 * Defines the core product table and product-related enums.
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
    'schedule'
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
        id: uuid('id').primaryKey().defaultRandom(),
        slug: varchar('slug', { length: 255 }).unique().notNull(),
        product_title: varchar('product_title', { length: 255 }).notNull(),
        secondary_title: varchar('secondary_title', { length: 255 }),

        // Content
        short_description: text('short_description'),
        full_description: text('full_description'), // Rich Text / HTML

        // Status & Availability
        status: productStatusEnum('status').default('draft').notNull(),
        scheduled_publish_at: timestamp('scheduled_publish_at'),
        is_delisted: boolean('is_delisted').default(false).notNull(),
        delist_date: timestamp('delist_date'),
        sales_channels: jsonb('sales_channels').default([]).notNull(), // e.g. ["web", "app"]

        // Pricing
        cost_price: decimal('cost_price', { precision: 10, scale: 2 }).default('0.00').notNull(),
        selling_price: decimal('selling_price', { precision: 10, scale: 2 }).default('0.00').notNull(),
        compare_at_price: decimal('compare_at_price', { precision: 10, scale: 2 }), // Nullable

        // Inventory & Logistics
        sku: varchar('sku', { length: 100 }).unique().notNull(),
        barcode: varchar('barcode', { length: 50 }),
        hsn_code: varchar('hsn_code', { length: 20 }),
        // CRITICAL FIX #7: Removed inventory_quantity - use inventory table instead
        // Query: SELECT SUM(available_quantity) FROM inventory WHERE product_id = ?

        // Physical dimensions
        weight: decimal('weight', { precision: 8, scale: 2 }), // kg
        length: decimal('length', { precision: 8, scale: 2 }), // cm
        breadth: decimal('breadth', { precision: 8, scale: 2 }), // cm
        height: decimal('height', { precision: 8, scale: 2 }), // cm
        pickup_location: varchar('pickup_location', { length: 100 }), // Store/Warehouse ID

        // Categorization
        // Hierarchical category structure using tiers table
        category_tier_1: uuid('category_tier_1')
            .references(() => tiers.id, { onDelete: 'set null' }),
        category_tier_2: uuid('category_tier_2')
            .references(() => tiers.id, { onDelete: 'set null' }),
        category_tier_3: uuid('category_tier_3')
            .references(() => tiers.id, { onDelete: 'set null' }),
        category_tier_4: uuid('category_tier_4')
            .references(() => tiers.id, { onDelete: 'set null' }),

        // Brand (Product Page Enhancement)
        brand_name: varchar('brand_name', { length: 255 }),
        brand_slug: varchar('brand_slug', { length: 255 }),

        // Feature Tags (Product Page Enhancement)
        tags: jsonb('tags').default([]), // ["RO", "UV", "UF"]

        // Bullet Point Highlights (Product Page Enhancement)
        highlights: jsonb('highlights').default([]), // ["10L capacity", "5 year warranty"]

        // Feature Cards with Icons (Product Page Enhancement)
        features: jsonb('features').default([]), // [{ icon: "Shield", title: "5 Year Warranty", description: "..." }]

        // Technical Specifications (Product Page Enhancement)
        specs: jsonb('specs'), // { technology: "RO+UV", storage: "10L", ... }

        // Grouping
        size_group: varchar('size_group', { length: 100 }),
        accessories_group: varchar('accessories_group', { length: 100 }),

        // Media
        primary_image_url: text('primary_image_url'),
        additional_images: jsonb('additional_images').default([]), // Array of URLs

        // SEO
        meta_title: varchar('meta_title', { length: 255 }),
        meta_description: text('meta_description'),

        // Flags
        is_limited_edition: boolean('is_limited_edition').default(false).notNull(),
        is_preorder_enabled: boolean('is_preorder_enabled').default(false).notNull(),
        preorder_release_date: timestamp('preorder_release_date'),
        is_gift_wrap_available: boolean('is_gift_wrap_available').default(false).notNull(),

        // Audit Fields
        created_at: timestamp('created_at').defaultNow().notNull(),
        updated_at: timestamp('updated_at').defaultNow().notNull(),
        created_by: uuid('created_by'),
        updated_by: uuid('updated_by'),

        // Soft Delete
        is_deleted: boolean('is_deleted').default(false).notNull(),
        deleted_at: timestamp('deleted_at'),
        deleted_by: uuid('deleted_by'),

        // Search Optimization (Phase 3 - Batch 1)
        // Full-text search vector combining title, description, and brand
        // Enables fast, ranked search results with PostgreSQL text search
        search_vector: tsvector('search_vector')
            .generatedAlwaysAs(
                sql`to_tsvector('english', 
                    COALESCE(product_title, '') || ' ' || 
                    COALESCE(short_description, '') || ' ' || 
                    COALESCE(brand_name, '')
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
        searchVectorIdx: index('products_search_vector_idx')
            .using('gin', table.search_vector),

        // Fuzzy search index on product title (pg_trgm)
        // Enables typo-tolerant search: "water purifer" finds "water purifier"
        // Supports ILIKE, similarity(), and <-> operators
        titleTrgmIdx: index('products_title_trgm_idx')
            .using('gin', sql`${table.product_title} gin_trgm_ops`),

        // JSONB tag search index (GIN)
        // Enables fast filtering by product tags: ["RO", "UV", "UF"]
        // Supports: tags @> '["RO"]' queries
        tagsIdx: index('products_tags_idx')
            .using('gin', table.tags),

        // Price range index (B-tree)
        // Optimizes price filtering and sorting queries
        // Supports: WHERE selling_price BETWEEN x AND y
        priceIdx: index('products_price_idx')
            .on(table.selling_price),

        // Composite index for common filter combinations
        // Optimizes: category + price range + status filtering (e-commerce standard)
        // Example query: Browse Water Purifiers, price $100-$500, active only
        categoryPriceStatusIdx: index('products_category_price_status_idx')
            .on(
                table.category_tier_1,
                table.selling_price,
                table.status,
                table.is_deleted
            ),

        // Soft delete index
        // Optimizes queries filtering out deleted products
        isDeletedIdx: index('products_is_deleted_idx')
            .on(table.is_deleted),

        // PHASE 3 BATCH 5: CHECK CONSTRAINTS (Data Validation)

        // Ensure prices are non-negative
        costPriceCheck: check('products_cost_price_check',
            sql`cost_price >= 0`),

        sellingPriceCheck: check('products_selling_price_check',
            sql`selling_price >= 0`),

        // Compare price must be higher than selling price (if set)
        compareAtPriceCheck: check('products_compare_at_price_check',
            sql`compare_at_price IS NULL OR compare_at_price >= selling_price`),
    })
);

// Types
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
