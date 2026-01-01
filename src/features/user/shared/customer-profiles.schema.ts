/**
 * Customer Profiles Schema
 *
 * Stores B2C customer-specific data separate from core user profile.
 * Includes preferences, marketing opt-ins, and account status.
 *
 * NOTE: This is for individual consumers (B2C).
 * For business customers, see business-profiles.schema.ts
 *
 * Simplified: Removed risk_score and login tracking (handled elsewhere)
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
} from 'drizzle-orm/pg-core';
import { users } from './user.schema';

// ============================================
// ENUMS
// ============================================

export const customerAccountStatusEnum = pgEnum('customer_account_status', [
  'active',
  'suspended',
  'closed',
]);

export const customerSegmentEnum = pgEnum('customer_segment', [
  'new',
  'regular',
  'vip',
  'at_risk', // Haven't ordered in a while
]);

// ============================================
// CUSTOMER PROFILES TABLE
// ============================================

/**
 * Customer profiles for B2C users
 * One-to-one relationship with users table
 */
export const customerProfiles = pgTable(
  'customer_profiles',
  {
    id: serial('id').primaryKey(),
    user_id: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .unique()
      .notNull(),

    // Customer segmentation
    segment: customerSegmentEnum('segment').default('new').notNull(),

    // Store credit & referrals
    store_credit_balance: decimal('store_credit_balance', { precision: 12, scale: 2 })
      .default('0.00')
      .notNull(),
    referral_code: varchar('referral_code', { length: 20 }).unique(), // Unique code for sharing
    referred_by_user_id: integer('referred_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    referral_bonus_credited: boolean('referral_bonus_credited').default(false).notNull(),

    // Marketing preferences
    marketing_opt_in: boolean('marketing_opt_in').default(false).notNull(),
    sms_opt_in: boolean('sms_opt_in').default(false).notNull(),
    email_opt_in: boolean('email_opt_in').default(true).notNull(),
    whatsapp_opt_in: boolean('whatsapp_opt_in').default(false).notNull(),
    push_notifications_opt_in: boolean('push_notifications_opt_in').default(true).notNull(),

    // Account status
    account_status: customerAccountStatusEnum('account_status').default('active').notNull(),
    suspended_reason: text('suspended_reason'),
    suspended_until: timestamp('suspended_until'),

    // Audit fields
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  table => ({
    // User lookup (unique constraint already provides index)
    referralCodeIdx: index('customer_profiles_referral_code_idx').on(table.referral_code),
    statusIdx: index('customer_profiles_status_idx').on(table.account_status),
    segmentIdx: index('customer_profiles_segment_idx').on(table.segment),
  })
);

// Export types for TypeScript
export type CustomerProfile = typeof customerProfiles.$inferSelect;
export type NewCustomerProfile = typeof customerProfiles.$inferInsert;
