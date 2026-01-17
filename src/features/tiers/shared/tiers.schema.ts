/**
 * Tiers Schema (Categories)
 *
 * Defines the recursive category structure.
 * Replaces the rigid legacy tier_1, tier_2... structure with a single flexible table.
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  pgEnum,
  index,
  foreignKey,
  boolean,
} from 'drizzle-orm/pg-core';

// ============================================
// ENUMS
// ============================================

export const tierStatusEnum = pgEnum('tier_status', ['active', 'inactive']);

// ============================================
// TIERS TABLE
// ============================================

export const tiers = pgTable(
  'tiers',
  {
    // Identity
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    code: varchar('code', { length: 255 }).unique().notNull(), // URL-friendly slug
    description: text('description'),

    // Hierarchy
    level: integer('level').notNull(), // 1=Root, 2=Sub, etc.
    parent_id: uuid('parent_id'), // Self-reference to parent tier
    priority: integer('priority').default(0).notNull(), // Display order


    // Status
    status: tierStatusEnum('status').default('active').notNull(),
    is_deleted: boolean('is_deleted').default(false).notNull(),
    usage_count: integer('usage_count').default(0).notNull(), // Denormalized count

    // Audit Fields
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  table => ({
    // Self-reference Foreign Key
    parentFk: foreignKey({
      columns: [table.parent_id],
      foreignColumns: [table.id],
      name: 'tiers_parent_id_fk',
    }).onDelete('set null'),

    // Indexes for common lookups
    parentIdx: index('tiers_parent_id_idx').on(table.parent_id),
    levelIdx: index('tiers_level_idx').on(table.level),
    codeIdx: index('tiers_code_idx').on(table.code),
    statusIdx: index('tiers_status_idx').on(table.status),
  })
);

// Types
export type Tier = typeof tiers.$inferSelect;
export type NewTier = typeof tiers.$inferInsert;
