/**
 * Catalogue Rules Schema
 *
 * Defines dynamic filters for including products in a catalogue.
 * (e.g., Include all products where Vendor = 'Nike')
 */

import {
    pgTable,
    uuid,
    varchar,
    text,
    index,
} from 'drizzle-orm/pg-core';
import { catalogues } from './catalogue.schema';

// ============================================
// CATALOGUE RULES TABLE
// ============================================

export const catalogueRules = pgTable(
    'catalogue_rules',
    {
        id: uuid('id').primaryKey().defaultRandom(),

        // Parent Link
        catalogue_id: uuid('catalogue_id')
            .references(() => catalogues.id, { onDelete: 'cascade' })
            .notNull(),

        // Rule Logic
        field: varchar('field', { length: 50 }).notNull(), // e.g. 'vendor', 'tag'
        operator: varchar('operator', { length: 50 }).notNull(), // e.g. 'equals', 'contains'
        value: text('value').notNull(), // e.g. 'Nike'
    },
    table => ({
        // Lookup rules by catalogue
        catalogueIdIdx: index('catalogue_rules_catalogue_id_idx').on(table.catalogue_id),
    })
);

// Types
export type CatalogueRule = typeof catalogueRules.$inferSelect;
export type NewCatalogueRule = typeof catalogueRules.$inferInsert;
