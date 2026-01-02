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
} from 'drizzle-orm/pg-core';

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
        // We are maintaining the flattened tier structure as requested
        category_tier_1: varchar('category_tier_1', { length: 100 }),
        category_tier_2: varchar('category_tier_2', { length: 100 }),
        category_tier_3: varchar('category_tier_3', { length: 100 }),
        category_tier_4: varchar('category_tier_4', { length: 100 }),

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
    },
    table => ({
        // Optimizing common lookups
        slugIdx: index('products_slug_idx').on(table.slug),
        skuIdx: index('products_sku_idx').on(table.sku),
        statusIdx: index('products_status_idx').on(table.status),
        categoryIdx: index('products_category_idx').on(table.category_tier_1, table.category_tier_2),
    })
);

// Types
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
