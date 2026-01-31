/**
 * Collection Schema
 *
 * Defines the collections table for grouping products.
 */

import { pgTable, uuid, varchar, text, timestamp, jsonb, pgEnum, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from '../../user/shared/user.schema';

// ============================================
// ENUMS
// ============================================

export const collectionTypeEnum = pgEnum('collection_type', ['manual', 'automated']);

export const collectionStatusEnum = pgEnum('collection_status', ['active', 'inactive', 'draft']);

export const collectionSortOrderEnum = pgEnum('collection_sort_order', [
  'best-selling',
  'price-asc',
  'price-desc',
  'manual',
  'created-desc',
  'created-asc',
]);

export const conditionMatchTypeEnum = pgEnum('condition_match_type', [
  'all', // AND
  'any', // OR
]);

// TypeScript constants for application use (Phase 1: Enum Consolidation)
export const COLLECTION_TYPES = collectionTypeEnum.enumValues;
export const COLLECTION_STATUSES = collectionStatusEnum.enumValues;
export const COLLECTION_SORT_ORDERS = collectionSortOrderEnum.enumValues;
export const CONDITION_MATCH_TYPES = conditionMatchTypeEnum.enumValues;

export type CollectionType = (typeof COLLECTION_TYPES)[number];
export type CollectionStatus = (typeof COLLECTION_STATUSES)[number];
export type CollectionSortOrder = (typeof COLLECTION_SORT_ORDERS)[number];
export type ConditionMatchType = (typeof CONDITION_MATCH_TYPES)[number];

// ============================================
// COLLECTIONS TABLE
// ============================================

export const collections = pgTable(
  'collections',
  {
    // Identity
    id: uuid('id').primaryKey().default(sql`uuid_generate_v7()`),
    title: varchar('title', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).unique().notNull(),
    description: text('description'), // Rich text

    // Type & Behavior
    type: collectionTypeEnum('type').default('manual').notNull(),
    status: collectionStatusEnum('status').default('draft').notNull(),
    sort_order: collectionSortOrderEnum('sort_order').default('manual').notNull(),

    // Automation Logic (only for automated collections)
    condition_match_type: conditionMatchTypeEnum('condition_match_type').default('all'),

    // Visuals
    banner_image_url: text('banner_image_url'),
    mobile_banner_image_url: text('mobile_banner_image_url'),

    // SEO
    meta_title: varchar('meta_title', { length: 255 }),
    meta_description: text('meta_description'),

    // Organization
    tags: jsonb('tags').default([]), // Internal tags

    // Scheduling
    published_at: timestamp('published_at'),

    // Audit Fields
    created_by: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_by: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
    deleted_by: uuid('deleted_by').references(() => users.id, { onDelete: 'set null' }),
    deleted_at: timestamp('deleted_at'),
  },
  table => ({
    // Optimizing common lookups
    slugIdx: index('collections_slug_idx').on(table.slug),
    typeIdx: index('collections_type_idx').on(table.type),
    statusIdx: index('collections_status_idx').on(table.status),
  })
);

// Types
export type Collection = typeof collections.$inferSelect;
export type NewCollection = typeof collections.$inferInsert;
