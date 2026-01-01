/**
 * Catalogue Schema
 *
 * Defines B2B/Seasonal catalogues that modify product visibility and pricing.
 */

import {
    pgTable,
    uuid,
    varchar,
    text,
    boolean,
    integer,
    timestamp,
    pgEnum,
    jsonb,
    index,
} from 'drizzle-orm/pg-core';

// ============================================
// ENUMS
// ============================================

export const catalogueStatusEnum = pgEnum('catalogue_status', [
    'active',
    'inactive',
    'draft'
]);

export const catalogueRuleMatchTypeEnum = pgEnum('catalogue_rule_match_type', [
    'all',
    'any'
]);

// ============================================
// CATALOGUES TABLE
// ============================================

export const catalogues = pgTable(
    'catalogues',
    {
        // Identity
        id: uuid('id').primaryKey().defaultRandom(),
        name: varchar('name', { length: 255 }).notNull(),
        description: text('description'),

        // Config
        status: catalogueStatusEnum('status').default('draft').notNull(),
        priority: integer('priority').default(5).notNull(), // 1=Highest

        // Validity
        valid_from: timestamp('valid_from').notNull(),
        valid_to: timestamp('valid_to'), // Nullable = Indefinite

        // Targeting (Simple Lists)
        assigned_segments: jsonb('assigned_segments').default([]), // List of Segment IDs
        assigned_roles: jsonb('assigned_roles').default([]), // List of Role IDs
        assigned_channels: jsonb('assigned_channels').default([]), // e.g. ['pos', 'b2b']

        // Source Configuration (The "Context")
        tier_level: varchar('tier_level', { length: 50 }), // e.g. 'tier2'
        tier_value: varchar('tier_value', { length: 100 }), // e.g. 'sports'
        rule_match_type: catalogueRuleMatchTypeEnum('rule_match_type').default('all').notNull(),

        // Audit Fields
        is_deleted: boolean('is_deleted').default(false).notNull(),
        created_at: timestamp('created_at').defaultNow().notNull(),
        updated_at: timestamp('updated_at').defaultNow().notNull(),
    },
    table => ({
        // Indexes
        statusIdx: index('catalogues_status_idx').on(table.status),
        priorityIdx: index('catalogues_priority_idx').on(table.priority),
        datesIdx: index('catalogues_dates_idx').on(table.valid_from, table.valid_to),
    })
);

// Types
export type Catalogue = typeof catalogues.$inferSelect;
export type NewCatalogue = typeof catalogues.$inferInsert;
