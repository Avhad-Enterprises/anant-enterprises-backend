/**
 * Blog Subsections Schema
 *
 * Defines structured sections (chapters) within a blog post.
 */

import { pgTable, uuid, varchar, text, integer, index } from 'drizzle-orm/pg-core';
import { blogs } from './blog.schema';

// ============================================
// BLOG SUBSECTIONS TABLE
// ============================================

export const blogSubsections = pgTable(
  'blog_subsections',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Parent Link
    blog_id: uuid('blog_id')
      .references(() => blogs.id, { onDelete: 'cascade' })
      .notNull(),

    // Content
    title: varchar('title', { length: 255 }),
    description: text('description'), // Body text
    image_url: text('image_url'),

    // Ordering
    sort_order: integer('sort_order').default(0).notNull(),
  },
  table => ({
    // Lookup sections by blog
    blogIdIdx: index('blog_subsections_blog_id_idx').on(table.blog_id),
  })
);

// Types
export type BlogSubsection = typeof blogSubsections.$inferSelect;
export type NewBlogSubsection = typeof blogSubsections.$inferInsert;
