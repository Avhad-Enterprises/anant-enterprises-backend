/**
 * Tags Schema
 *
 * Defines the central tags table for consistent tagging across the system.
 */

import { pgTable, uuid, varchar, integer, boolean, timestamp, index } from 'drizzle-orm/pg-core';

// ============================================
// TAGS TABLE
// ============================================

export const tags = pgTable(
  'tags',
  {
    // Identity
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).unique().notNull(), // Tag Name (e.g., "Summer")
    type: varchar('type', { length: 50 }).default('product').notNull(), // Context (product, order, customer)

    // Metadata
    usage_count: integer('usage_count').default(0).notNull(), // Number of times used
    status: boolean('status').default(true).notNull(), // Active/Inactive

    // Audit Fields
    is_deleted: boolean('is_deleted').default(false).notNull(),
    created_by: uuid('created_by'), // Optional user reference
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  table => ({
    // Indexes for fast lookup
    nameIdx: index('tags_name_idx').on(table.name),
    typeIdx: index('tags_type_idx').on(table.type),
  })
);

// Types
export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;
