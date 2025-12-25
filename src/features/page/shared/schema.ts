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
 * Pages Schema
 * Static content pages (About Us, FAQ, Terms, Privacy Policy, etc.)
 */

// Enums
export const pageStatusEnum = pgEnum('page_status', ['draft', 'published', 'archived']);
export const pageTemplateEnum = pgEnum('page_template', [
  'default',
  'full_width',
  'sidebar_left',
  'sidebar_right',
  'contact',
  'faq',
]);

/**
 * Pages Table
 * CMS pages for static content
 */
export const pages = pgTable(
  'pages',
  {
    id: serial('id').primaryKey(),
    
    // Basic info
    title: varchar('title', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull().unique(),
    content: text('content'),
    excerpt: text('excerpt'),
    
    // Template & Display
    template: pageTemplateEnum('template').default('default').notNull(),
    featured_image: varchar('featured_image', { length: 500 }),
    
    // SEO
    meta_title: varchar('meta_title', { length: 255 }),
    meta_description: varchar('meta_description', { length: 500 }),
    meta_keywords: varchar('meta_keywords', { length: 255 }),
    
    // Status & Publishing
    status: pageStatusEnum('status').default('draft').notNull(),
    is_homepage: boolean('is_homepage').default(false),
    show_in_nav: boolean('show_in_nav').default(false),
    published_at: timestamp('published_at'),
    
    // Sorting
    sort_order: integer('sort_order').default(0),
    
    // Author
    author_id: integer('author_id').references(() => users.id, { onDelete: 'set null' }),
    
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
    slugUniqueIdx: uniqueIndex('pages_slug_unique_idx').on(table.slug),
    statusIdx: index('pages_status_idx').on(table.status),
    isHomepageIdx: index('pages_is_homepage_idx').on(table.is_homepage),
    showInNavIdx: index('pages_show_in_nav_idx').on(table.show_in_nav),
    authorIdIdx: index('pages_author_id_idx').on(table.author_id),
    publishedAtIdx: index('pages_published_at_idx').on(table.published_at),
  })
);

// Export types
export type Page = typeof pages.$inferSelect;
export type NewPage = typeof pages.$inferInsert;

// Note: Temporary reference
const users = pgTable('users', {
  id: integer('id').primaryKey(),
});
