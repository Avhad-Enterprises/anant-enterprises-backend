/**
 * Business Customer Profiles Schema (B2B)
 *
 * Stores business account information for B2B customers.
 * Includes company details, credit terms, and bulk pricing.
 *
 * Simplified: Removed revenue/employee ranges and workflow flags
 */

import {
  pgTable,
  serial,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  decimal,
  index,
  pgEnum,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from './user.schema';
import { userAddresses } from './addresses.schema';

// ============================================
// ENUMS
// ============================================

export const businessTypeEnum = pgEnum('business_type', [
  'sole_proprietor',
  'partnership',
  'llc',
  'corporation',
  'nonprofit',
]);

export const paymentTermsEnum = pgEnum('payment_terms', [
  'immediate',
  'net_15',
  'net_30',
  'net_60',
  'net_90',
]);

export const businessTierEnum = pgEnum('business_tier', ['standard', 'silver', 'gold', 'platinum']);

export const businessAccountStatusEnum = pgEnum('business_account_status', [
  'pending', // Awaiting approval
  'active',
  'suspended',
  'closed',
]);

// ============================================
// BUSINESS CUSTOMER PROFILES TABLE
// ============================================

/**
 * Business customer profiles for B2B users
 * One-to-one relationship with users table
 */
export const businessCustomerProfiles = pgTable(
  'business_customer_profiles',
  {
    id: serial('id').primaryKey(),
    user_id: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .unique()
      .notNull(),

    // Business info
    business_type: businessTypeEnum('business_type').notNull(),
    company_legal_name: varchar('company_legal_name', { length: 255 }).notNull(),
    company_trade_name: varchar('company_trade_name', { length: 255 }),
    company_registration_number: varchar('company_registration_number', { length: 100 }),
    industry: varchar('industry', { length: 100 }),
    website: varchar('website', { length: 255 }),

    // Tax info
    tax_id: varchar('tax_id', { length: 50 }), // GST/VAT/TIN
    tax_exempt: boolean('tax_exempt').default(false).notNull(),
    tax_exemption_certificate_url: varchar('tax_exemption_certificate_url', { length: 500 }),

    // Contact
    business_email: varchar('business_email', { length: 255 }).notNull(),
    business_phone: varchar('business_phone', { length: 20 }),
    business_phone_country_code: varchar('business_phone_country_code', { length: 5 }),

    // Addresses (FK)
    billing_address_id: integer('billing_address_id').references(() => userAddresses.id, {
      onDelete: 'set null',
    }),
    shipping_address_id: integer('shipping_address_id').references(() => userAddresses.id, {
      onDelete: 'set null',
    }),

    // Credit terms
    payment_terms: paymentTermsEnum('payment_terms').default('immediate').notNull(),
    credit_limit: decimal('credit_limit', { precision: 12, scale: 2 }).default('0.00').notNull(),
    credit_used: decimal('credit_used', { precision: 12, scale: 2 }).default('0.00').notNull(),
    credit_approved_by: uuid('credit_approved_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    credit_approved_at: timestamp('credit_approved_at'),

    // Account management
    account_manager_id: uuid('account_manager_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    tier: businessTierEnum('tier').default('standard').notNull(),

    // Pricing
    bulk_discount_percent: decimal('bulk_discount_percent', { precision: 5, scale: 2 })
      .default('0.00')
      .notNull(),
    minimum_order_value: decimal('minimum_order_value', { precision: 12, scale: 2 }),

    // Account status
    account_status: businessAccountStatusEnum('account_status').default('pending').notNull(),
    approved_by: uuid('approved_by').references(() => users.id, { onDelete: 'set null' }),
    approved_at: timestamp('approved_at'),
    suspended_reason: text('suspended_reason'),

    // Notes
    notes: text('notes'), // Internal admin notes

    // Audit fields
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  table => ({
    // Status index for filtering
    statusIdx: index('business_profiles_status_idx').on(table.account_status),
    // Tier for bulk operations
    tierIdx: index('business_profiles_tier_idx').on(table.tier),
    // Account manager for their dashboard
    accountManagerIdx: index('business_profiles_account_manager_idx').on(table.account_manager_id),
  })
);

// Export types for TypeScript
export type BusinessCustomerProfile = typeof businessCustomerProfiles.$inferSelect;
export type NewBusinessCustomerProfile = typeof businessCustomerProfiles.$inferInsert;
