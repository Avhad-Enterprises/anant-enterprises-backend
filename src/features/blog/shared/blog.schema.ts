/**
 * Blog Schema
 *
 * Defines blog posts with support for rich media and SEO.
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  pgEnum,
  jsonb,
  index,
  boolean,
} from 'drizzle-orm/pg-core';

// ============================================
// ENUMS
// ============================================

export const blogStatusEnum = pgEnum('blog_status', ['public', 'private', 'draft']);

// ============================================
// BLOGS TABLE
// ============================================

export const blogs = pgTable(
  'blogs',
  {
    // 1. Identity & Content
    id: uuid('id').primaryKey().defaultRandom(),
    title: varchar('title', { length: 255 }).notNull(),
    quote: varchar('quote', { length: 500 }),
    description: varchar('description', { length: 150 }), // Summary
    content: text('content'), // HTML/Rich Text body
    slug: varchar('slug', { length: 255 }).unique().notNull(),

    // 2. Media & Visuals
    main_image_pc_url: text('main_image_pc_url'),
    main_image_mobile_url: text('main_image_mobile_url'),

    // Admin Fields
    admin_comment: text('admin_comment'),

    // 3. Categorization & Metadata
    category: varchar('category', { length: 100 }), // e.g., 'Product Guide'
    tags: jsonb('tags').default([]), // Search keywords
    author: varchar('author', { length: 255 }), // Display name

    // 4. SEO Information
    meta_title: varchar('meta_title', { length: 60 }),
    meta_description: varchar('meta_description', { length: 160 }),

    // 5. Status & Publishing
    status: blogStatusEnum('status').default('draft').notNull(),
    published_at: timestamp('published_at'),
    views_count: integer('views_count').default(0).notNull(),

    // 6. Audit Fields
    created_by: uuid('created_by'), // Reference to Creator UUID
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),

    // 7. System status
    is_deleted: boolean('is_deleted').default(false).notNull(),
  },
  table => ({
    // Indexes
    slugIdx: index('blogs_slug_idx').on(table.slug),
    statusIdx: index('blogs_status_idx').on(table.status),
    categoryIdx: index('blogs_category_idx').on(table.category),
  })
);

// Types
export type Blog = typeof blogs.$inferSelect;
export type NewBlog = typeof blogs.$inferInsert;
