import {
  pgTable,
  serial,
  timestamp,
  boolean,
  integer,
  varchar,
  decimal,
  jsonb,
  index,
  pgEnum,
} from 'drizzle-orm/pg-core';

/**
 * Tax Rules Schema
 * Configure tax rates based on location, product category, etc.
 */

// Enums
export const taxTypeEnum = pgEnum('tax_type', ['percentage', 'fixed_amount']);
export const taxStatusEnum = pgEnum('tax_status', ['active', 'inactive']);

/**
 * Tax Rules Table
 * Define tax calculation rules
 */
export const taxRules = pgTable(
  'tax_rules',
  {
    id: serial('id').primaryKey(),
    
    // Basic info
    name: varchar('name', { length: 180 }).notNull(),
    code: varchar('code', { length: 50 }).notNull(),
    type: taxTypeEnum('type').notNull(),
    
    // Rate
    rate: decimal('rate', { precision: 5, scale: 2 }).notNull(),
    
    // Components (for compound taxes like GST)
    components: jsonb('components'),
    
    // Application rules
    countries: jsonb('countries'),
    states: jsonb('states'),
    postal_codes: jsonb('postal_codes'),
    
    // Product applicability
    applies_to_shipping: boolean('applies_to_shipping').default(true),
    product_categories: jsonb('product_categories'),
    
    // Priority (for multiple overlapping rules)
    priority: integer('priority').default(0),
    
    // Status
    status: taxStatusEnum('status').default('active').notNull(),
    
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
    codeIdx: index('tax_rules_code_idx').on(table.code),
    statusIdx: index('tax_rules_status_idx').on(table.status),
    priorityIdx: index('tax_rules_priority_idx').on(table.priority),
  })
);

// Export types
export type TaxRule = typeof taxRules.$inferSelect;
export type NewTaxRule = typeof taxRules.$inferInsert;
