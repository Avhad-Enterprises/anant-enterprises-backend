import {
  pgTable,
  timestamp,
  boolean,
  varchar,
  uuid,
  date,
  index,
  pgEnum,
} from 'drizzle-orm/pg-core';

// ============================================
// ENUMS
// ============================================

export const userTypeEnum = pgEnum('user_type', ['individual', 'business']);
export const genderEnum = pgEnum('gender', ['male', 'female', 'other', 'prefer_not_to_say']);

// ============================================
// USERS TABLE
// ============================================

/**
 * Users table schema
 * Stores user account information and preferences
 *
 * NOTE: Roles are managed via the dynamic RBAC system (user_roles table)
 * NOTE: auth_id links to Supabase Auth (auth.users.id)
 *
 * Indexes:
 * - email_is_deleted_idx: Composite index for email lookups
 * - created_at_idx: For sorting/pagination
 * - auth_id_idx: For Supabase Auth lookups
 * - user_type_idx: For B2C/B2B filtering
 */
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(), // Changed to UUID for consistency
    auth_id: uuid('auth_id').unique(), // Links to Supabase Auth (auth.users.id)
    user_type: userTypeEnum('user_type').default('individual').notNull(), // B2C or B2B

    // Basic info
    name: varchar('name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }).unique().notNull(),
    password: varchar('password', { length: 255 }), // Optional - Supabase Auth manages passwords

    // Phone
    phone_number: varchar('phone_number', { length: 20 }),
    phone_country_code: varchar('phone_country_code', { length: 5 }), // +91, +1, etc.
    phone_verified: boolean('phone_verified').default(false).notNull(),
    phone_verified_at: timestamp('phone_verified_at'),

    // Profile
    profile_image_url: varchar('profile_image_url', { length: 500 }),
    date_of_birth: date('date_of_birth'),
    gender: genderEnum('gender'),

    // Regional preferences
    preferred_language: varchar('preferred_language', { length: 10 }).default('en').notNull(), // ISO 639-1
    preferred_currency: varchar('preferred_currency', { length: 3 }).default('INR').notNull(), // ISO 4217
    timezone: varchar('timezone', { length: 50 }).default('Asia/Kolkata').notNull(), // IANA timezone

    // Audit fields - self-referential FKs will be added via migration
    created_by: uuid('created_by'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_by: uuid('updated_by'),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
    is_deleted: boolean('is_deleted').default(false).notNull(),
    deleted_by: uuid('deleted_by'),
    deleted_at: timestamp('deleted_at'),
  },
  table => ({
    // Composite index for email lookups (queries always filter by is_deleted)
    emailIsDeletedIdx: index('users_email_is_deleted_idx').on(table.email, table.is_deleted),
    // Index for sorting/pagination
    createdAtIdx: index('users_created_at_idx').on(table.created_at),
    // Index for Supabase Auth lookups
    authIdIdx: index('users_auth_id_idx').on(table.auth_id),
    // Index for B2C/B2B filtering
    userTypeIdx: index('users_user_type_idx').on(table.user_type, table.is_deleted),
  })
);

// Export types for TypeScript
// Note: Use IUser from ./interface.ts as the canonical type for user objects
// User type is kept for Drizzle internal usage only
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
