/**
 * Company Schema (B2B/Tenant)
 *
 * Defines the organization entity for B2B features.
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';

// ============================================
// ENUMS
// ============================================

export const userAssignmentTypeEnum = pgEnum('company_user_assignment_type', [
  'manual',
  'automated',
]);

export const companyMatchTypeEnum = pgEnum('company_match_type', ['all', 'any']);

// ============================================
// COMPANIES TABLE
// ============================================

export const companies = pgTable(
  'companies',
  {
    // Identity
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),

    // Contact
    contact_email: varchar('contact_email', { length: 255 }),
    contact_phone: varchar('contact_phone', { length: 50 }),

    // Business Details
    gst_number: varchar('gst_number', { length: 50 }),
    pan_number: varchar('pan_number', { length: 50 }),

    address: text('address'),
    company_type: varchar('company_type', { length: 100 }), // Industry or classification

    // Automation Logic
    user_assignment_type: userAssignmentTypeEnum('user_assignment_type')
      .default('manual')
      .notNull(),
    match_type: companyMatchTypeEnum('match_type').default('all'), // AND/OR logic for rules

    // Status
    status: boolean('status').default(true).notNull(), // Active/Inactive

    // Audit Fields
    is_deleted: boolean('is_deleted').default(false).notNull(),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  table => ({
    // Optimizing Lookups
    nameIdx: index('companies_name_idx').on(table.name),
    statusIdx: index('companies_status_idx').on(table.status),
  })
);

// Types
export type Company = typeof companies.$inferSelect;
export type NewCompany = typeof companies.$inferInsert;
