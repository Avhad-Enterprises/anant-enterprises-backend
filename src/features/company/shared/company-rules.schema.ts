/**
 * Company Rules Schema
 *
 * Defines the rules for automated user assignment to companies.
 * Replaces the 'automated_rules' JSON blob from the legacy schema.
 */

import {
    pgTable,
    uuid,
    varchar,
    text,
    index,
} from 'drizzle-orm/pg-core';
import { companies } from './company.schema';

// ============================================
// COMPANY RULES TABLE
// ============================================

export const companyRules = pgTable(
    'company_rules',
    {
        id: uuid('id').primaryKey().defaultRandom(),

        // Parent Link
        company_id: uuid('company_id')
            .references(() => companies.id, { onDelete: 'cascade' })
            .notNull(),

        // Rule Logic
        field: varchar('field', { length: 50 }).notNull(), // e.g. 'email_domain'
        operator: varchar('operator', { length: 50 }).notNull(), // e.g. 'ends_with', 'equals'
        value: text('value').notNull(), // e.g. 'google.com'
    },
    table => ({
        // Lookup rules by company
        companyIdIdx: index('company_rules_company_id_idx').on(table.company_id),
    })
);

// Types
export type CompanyRule = typeof companyRules.$inferSelect;
export type NewCompanyRule = typeof companyRules.$inferInsert;
