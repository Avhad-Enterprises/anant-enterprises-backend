/**
 * Tags Schema
 *
 * Defines the central tags table for consistent tagging across the system.
 */

import { pgTable, uuid, varchar, integer, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from '../../user/shared/user.schema';

// ============================================
// TAGS TABLE
// ============================================

export const tags = pgTable(
  'tags',
  {
    // Identity
    id: uuid('id').primaryKey().default(sql`uuid_generate_v7()`),
    name: varchar('name', { length: 255 }).unique().notNull(), // Tag Name (e.g., "Summer")
    type: varchar('type', { length: 50 }).default('product').notNull(), // Context (product, order, customer)

    // Metadata
    usage_count: integer('usage_count').default(0).notNull(), // Number of times used
    status: boolean('status').default(true).notNull(), // Active/Inactive

    // Audit Fields
    is_deleted: boolean('is_deleted').default(false).notNull(),
    created_by: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_by: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
    deleted_by: uuid('deleted_by').references(() => users.id, { onDelete: 'set null' }),
    deleted_at: timestamp('deleted_at'),
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
