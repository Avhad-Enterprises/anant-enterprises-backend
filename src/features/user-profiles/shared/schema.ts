import {
  pgTable,
  serial,
  timestamp,
  boolean,
  integer,
  varchar,
  text,
  date,
  decimal,
  jsonb,
  index,
  uniqueIndex,
  pgEnum,
} from 'drizzle-orm/pg-core';

/**
 * User Profiles Schema
 * Customer profile data and preferences (1:1 with users who have customer role via RBAC)
 */

// Enums
export const riskProfileEnum = pgEnum('risk_profile', ['low', 'medium', 'high']);
export const gdprStatusEnum = pgEnum('gdpr_status', ['na', 'pending', 'compliant']);

/**
 * User Profiles Table
 * Customer-specific profile data and preferences
 */
export const userProfiles = pgTable(
  'user_profiles',
  {
    id: serial('id').primaryKey(),
    user_id: integer('user_id')
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Personal information
    first_name: varchar('first_name', { length: 100 }).notNull(),
    middle_name: varchar('middle_name', { length: 100 }),
    last_name: varchar('last_name', { length: 100 }).notNull(),
    profile_image_url: varchar('profile_image_url', { length: 500 }),
    gender: varchar('gender', { length: 30 }),
    date_of_birth: date('date_of_birth'),

    // Preferences and communication
    marketing_preferences: jsonb('marketing_preferences'),
    communication_preferences: jsonb('communication_preferences'),
    subscribed_email: boolean('subscribed_email').default(true).notNull(),
    subscribed_sms: boolean('subscribed_sms').default(false).notNull(),

    // Loyalty program
    loyalty_enrolled: boolean('loyalty_enrolled').default(false).notNull(),
    loyalty_points: integer('loyalty_points').default(0).notNull(),
    credit_balance: decimal('credit_balance', { precision: 12, scale: 2 }).default('0.00').notNull(),

    // Customer segmentation
    customer_segment: varchar('customer_segment', { length: 60 }),
    risk_profile: riskProfileEnum('risk_profile'),

    // Tags and notes
    tags: jsonb('tags').default('[]').notNull(),
    notes: text('notes'),

    // Referral system
    referral_code: varchar('referral_code', { length: 32 }).unique(),
    referred_by_user_id: integer('referred_by_user_id').references(() => users.id),

    // GDPR compliance
    gdpr_status: gdprStatusEnum('gdpr_status').default('na').notNull(),
    consent_marketing_at: timestamp('consent_marketing_at'),
    consent_privacy_version: varchar('consent_privacy_version', { length: 20 }),

    // Audit fields
    created_by: integer('created_by').references(() => users.id),
    updated_by: integer('updated_by').references(() => users.id),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
    is_deleted: boolean('is_deleted').default(false).notNull(),
    deleted_at: timestamp('deleted_at'),
    deleted_by: integer('deleted_by').references(() => users.id),
  },
  (table) => ({
    userIdIdx: uniqueIndex('user_profiles_user_id_idx').on(table.user_id),
    referralCodeIdx: uniqueIndex('user_profiles_referral_code_idx').on(table.referral_code),
    customerSegmentIdx: index('user_profiles_customer_segment_idx').on(table.customer_segment),
    loyaltyEnrolledIdx: index('user_profiles_loyalty_enrolled_idx').on(table.loyalty_enrolled),
    referredByIdx: index('user_profiles_referred_by_idx').on(table.referred_by_user_id),
    createdAtIdx: index('user_profiles_created_at_idx').on(table.created_at),
  })
);

// Export types
export type UserProfile = typeof userProfiles.$inferSelect;
export type NewUserProfile = typeof userProfiles.$inferInsert;

// Temporary reference
const users = pgTable('users', {
  id: integer('id').primaryKey(),
});
