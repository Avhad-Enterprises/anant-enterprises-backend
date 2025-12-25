import {
  pgTable,
  serial,
  timestamp,
  boolean,
  integer,
  varchar,
  text,
  index,
  uniqueIndex,
  pgEnum,
} from 'drizzle-orm/pg-core';

/**
 * Categories Schema
 * Self-referencing hierarchical categories (Shopify-style unlimited nesting)
 */

// Enums
export const categoryStatusEnum = pgEnum('category_status', ['active', 'inactive', 'archived']);

/**
 * Categories Table
 * Unlimited nested categories using self-referencing parent_id
 */
export const categories = pgTable(
  'categories',
  {
    id: serial('id').primaryKey(),
    parent_id: integer('parent_id'),
    
    // Basic info
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull().unique(),
    description: text('description'),
    
    // Hierarchy tracking
    level: integer('level').default(0).notNull(),
    path: varchar('path', { length: 500 }),
    
    // Display
    image_url: varchar('image_url', { length: 500 }),
    icon: varchar('icon', { length: 100 }),
    sort_order: integer('sort_order').default(0),
    
    // SEO
    meta_title: varchar('meta_title', { length: 255 }),
    meta_description: varchar('meta_description', { length: 500 }),
    meta_keywords: varchar('meta_keywords', { length: 255 }),
    
    // Status
    status: categoryStatusEnum('status').default('active').notNull(),
    is_visible: boolean('is_visible').default(true),
    is_featured: boolean('is_featured').default(false),
    
    // Product count (denormalized for performance)
    product_count: integer('product_count').default(0),
    
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
    parentIdIdx: index('categories_parent_id_idx').on(table.parent_id),
    slugUniqueIdx: uniqueIndex('categories_slug_unique_idx').on(table.slug),
    statusIdx: index('categories_status_idx').on(table.status),
    isVisibleIdx: index('categories_is_visible_idx').on(table.is_visible),
    isFeaturedIdx: index('categories_is_featured_idx').on(table.is_featured),
    levelIdx: index('categories_level_idx').on(table.level),
    pathIdx: index('categories_path_idx').on(table.path),
    sortOrderIdx: index('categories_sort_order_idx').on(table.sort_order),
  })
);

// Export types
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
