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
  varchar,
  text,
  boolean,
  timestamp,
  decimal,
  index,
  pgEnum,
  uuid,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from '../../user/shared/user.schema';

// ============================================
// ENUMS
// ============================================

export const customerAccountStatusEnum = pgEnum('customer_account_status', [
  'active',
  'inactive',
  'banned',
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
    id: uuid('id').primaryKey().default(sql`uuid_generate_v7()`),
    user_id: uuid('user_id')
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
    referred_by_user_id: uuid('referred_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    // Note: referral_bonus_credited removed - track via store_credit transactions instead

    // Marketing preferences
    marketing_opt_in: boolean('marketing_opt_in').default(false).notNull(),
    sms_opt_in: boolean('sms_opt_in').default(false).notNull(),
    email_opt_in: boolean('email_opt_in').default(true).notNull(),
    whatsapp_opt_in: boolean('whatsapp_opt_in').default(false).notNull(),
    push_notifications_opt_in: boolean('push_notifications_opt_in').default(true).notNull(),

    // Account status
    account_status: customerAccountStatusEnum('account_status').default('active').notNull(),
    banned_reason: text('banned_reason'),
    banned_until: timestamp('banned_until'), // NULL = permanent ban, timestamp = temporary ban

    // Risk Profile
    risk_profile: varchar('risk_profile', { length: 20 }).default('low'), // low, medium, high

    // Loyalty Program
    loyalty_enrolled: boolean('loyalty_enrolled').default(false).notNull(),
    loyalty_tier: varchar('loyalty_tier', { length: 50 }),
    loyalty_points: decimal('loyalty_points', { precision: 12, scale: 2 }).default('0'),
    loyalty_enrollment_date: timestamp('loyalty_enrollment_date'),

    // Subscription
    subscription_plan: varchar('subscription_plan', { length: 100 }),
    subscription_status: varchar('subscription_status', { length: 20 }), // active, paused, cancelled
    billing_cycle: varchar('billing_cycle', { length: 20 }), // monthly, yearly
    subscription_start_date: timestamp('subscription_start_date'),
    auto_renew: boolean('auto_renew').default(false),

    // Notes
    notes: text('notes'),

    // Audit fields
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  table => ({
    // User lookup (unique constraint already provides index)
    referralCodeIdx: index('customer_profiles_referral_code_idx').on(table.referral_code),
    statusIdx: index('customer_profiles_status_idx').on(table.account_status),
    segmentIdx: index('customer_profiles_segment_idx').on(table.segment),
    riskIdx: index('customer_profiles_risk_idx').on(table.risk_profile),
  })
);

// Export types for TypeScript
export type CustomerProfile = typeof customerProfiles.$inferSelect;
export type NewCustomerProfile = typeof customerProfiles.$inferInsert;
