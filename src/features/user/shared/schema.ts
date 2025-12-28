import { pgTable, serial, timestamp, boolean, integer, varchar, index, uniqueIndex, pgEnum } from 'drizzle-orm/pg-core';

/**
 * Users Schema
 * Core authentication and identity table
 * Security-critical data only - no business logic or profile data
 */

// Enums
export const accountStatusEnum = pgEnum('account_status', ['pending', 'active', 'inactive', 'banned', 'locked']);

/**
 * Users Table
 * Authentication and account management
 */
export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),

    // Basic identification
    email: varchar('email', { length: 190 }).notNull().unique(),
    phone_number: varchar('phone_number', { length: 30 }),

    // Authentication
    password_hash: varchar('password_hash', { length: 255 }),
    email_verified: boolean('email_verified').default(false).notNull(),
    email_verified_at: timestamp('email_verified_at'),
    phone_verified: boolean('phone_verified').default(false).notNull(),
    phone_verified_at: timestamp('phone_verified_at'),

    // OTP and password reset
    otp_code: varchar('otp_code', { length: 10 }),
    otp_expires_at: timestamp('otp_expires_at'),
    reset_token_hash: varchar('reset_token_hash', { length: 255 }),
    reset_expires_at: timestamp('reset_expires_at'),

    // Account status and security
    account_status: accountStatusEnum('account_status').default('active').notNull(),

    // Login tracking
    last_login_at: timestamp('last_login_at'),
    last_login_ip: varchar('last_login_ip', { length: 45 }),
    failed_login_attempts: integer('failed_login_attempts').default(0).notNull(),
    locked_until: timestamp('locked_until'),

    // Audit fields
    created_by: integer('created_by'),
    updated_by: integer('updated_by'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
    is_deleted: boolean('is_deleted').default(false).notNull(),
    deleted_at: timestamp('deleted_at'),
    deleted_by: integer('deleted_by'),
  },
  (table) => ({
    emailIdx: uniqueIndex('users_email_idx').on(table.email),
    phoneIdx: index('users_phone_idx').on(table.phone_number),
    accountStatusIdx: index('users_account_status_idx').on(table.account_status),
    lastLoginIdx: index('users_last_login_idx').on(table.last_login_at),
    emailDeletedIdx: index('users_email_deleted_idx').on(table.email, table.is_deleted),
    createdAtIdx: index('users_created_at_idx').on(table.created_at),
  })
);

// Export types for TypeScript
// Note: Use IUser from ./interface.ts as the canonical type for user objects
// User type is kept for Drizzle internal usage only
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
