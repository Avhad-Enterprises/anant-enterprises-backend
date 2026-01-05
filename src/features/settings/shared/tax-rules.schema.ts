/**
 * Tax Rules Schema
 *
 * Admin-configurable tax rules for multi-regional e-commerce.
 * Supports different tax rates per country, region, and product type.
 *
 * Features:
 * - Country/region specific rates
 * - Product category filtering
 * - Inclusive vs exclusive tax
 * - Compound/stacked taxes
 * - Date-based effective periods
 *
 * Simplified: Removed native_name and display_order from countries
 */

import {
  pgTable,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  decimal,
  date,
  index,
  pgEnum,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from '../../user';

// ============================================
// ENUMS
// ============================================

export const taxTypeEnum = pgEnum('tax_type', ['inclusive', 'exclusive']);
export const taxAppliesToEnum = pgEnum('tax_applies_to', [
  'all',
  'physical_goods',
  'digital_goods',
  'services',
  'shipping',
]);

// ============================================
// TAX RULES TABLE
// ============================================

/**
 * Tax rules configuration
 * Admin sets rates per country/region
 */
export const taxRules = pgTable(
  'tax_rules',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Geographic scope
    country_code: varchar('country_code', { length: 2 }).notNull(), // ISO 3166-1 alpha-2
    region_code: varchar('region_code', { length: 10 }), // State/province code (null = whole country)
    postal_code_pattern: varchar('postal_code_pattern', { length: 20 }), // Optional: "9*" = all starting with 9

    // Tax details
    tax_name: varchar('tax_name', { length: 100 }).notNull(), // "GST", "VAT", "Sales Tax"
    tax_code: varchar('tax_code', { length: 20 }), // Internal code: "IN_GST_18", "US_CA_SALES"
    tax_rate: decimal('tax_rate', { precision: 6, scale: 3 }).notNull(), // 18.000 for 18%
    tax_type: taxTypeEnum('tax_type').default('exclusive').notNull(),
    applies_to: taxAppliesToEnum('applies_to').default('all').notNull(),

    // Compound taxes (stacking)
    is_compound: boolean('is_compound').default(false).notNull(), // Stacked on other taxes
    priority: integer('priority').default(0).notNull(), // Order for compound taxes

    // Date range
    effective_from: date('effective_from').notNull(),
    effective_until: date('effective_until'), // Null = no end date

    // Status
    is_active: boolean('is_active').default(true).notNull(),
    description: text('description'),

    // Audit
    created_by: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    updated_by: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  table => ({
    // Primary lookup: country + active + date
    countryActiveIdx: index('tax_rules_country_active_idx').on(
      table.country_code,
      table.is_active,
      table.effective_from
    ),
    // Region-level lookup
    regionIdx: index('tax_rules_region_idx').on(table.country_code, table.region_code),
    // Tax code lookup for reporting
    taxCodeIdx: index('tax_rules_tax_code_idx').on(table.tax_code),
    // Effective date range for filtering
    effectiveIdx: index('tax_rules_effective_idx').on(table.effective_from, table.effective_until),
  })
);

// Export types
export type TaxRule = typeof taxRules.$inferSelect;
export type NewTaxRule = typeof taxRules.$inferInsert;

// ============================================
// COUNTRIES TABLE (Reference)
// ============================================

/**
 * Country reference table
 * Stores country data for dropdowns and validation
 */
export const countries = pgTable(
  'countries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: varchar('code', { length: 2 }).unique().notNull(), // ISO 3166-1 alpha-2
    code_alpha3: varchar('code_alpha3', { length: 3 }).unique().notNull(), // ISO 3166-1 alpha-3
    name: varchar('name', { length: 100 }).notNull(),
    phone_code: varchar('phone_code', { length: 10 }), // +91, +1
    currency_code: varchar('currency_code', { length: 3 }), // Default currency
    is_shipping_enabled: boolean('is_shipping_enabled').default(false).notNull(),
    is_billing_enabled: boolean('is_billing_enabled').default(false).notNull(),
    requires_state: boolean('requires_state').default(false).notNull(), // For address validation
    is_active: boolean('is_active').default(true).notNull(),
  },
  table => ({
    // Active countries for dropdowns
    activeIdx: index('countries_active_idx').on(table.is_active),
    // Code lookup
    codeIdx: index('countries_code_idx').on(table.code),
  })
);

// Export types
export type Country = typeof countries.$inferSelect;
export type NewCountry = typeof countries.$inferInsert;

// ============================================
// REGIONS TABLE (States/Provinces)
// ============================================

/**
 * Region/state reference table
 * For countries that require state-level addresses or taxes
 */
export const regions = pgTable(
  'regions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    country_code: varchar('country_code', { length: 2 }).notNull(), // FK to countries.code
    code: varchar('code', { length: 10 }).notNull(), // State/province code (MH, CA, TX)
    name: varchar('name', { length: 100 }).notNull(), // Maharashtra, California
    has_special_tax: boolean('has_special_tax').default(false).notNull(),
    is_active: boolean('is_active').default(true).notNull(),
  },
  table => ({
    // Lookup by country
    countryIdx: index('regions_country_idx').on(table.country_code, table.is_active),
    // Unique region per country
    countryCodeUnique: index('regions_country_code_unique_idx').on(table.country_code, table.code),
  })
);

// Export types
export type Region = typeof regions.$inferSelect;
export type NewRegion = typeof regions.$inferInsert;
