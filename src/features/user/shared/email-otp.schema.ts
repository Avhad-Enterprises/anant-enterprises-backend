/**
 * Email OTP Schema
 * 
 * Stores one-time passwords for email verification.
 * OTPs expire after 5 minutes and allow max 3 verification attempts.
 */

import {
  pgTable,
  serial,
  varchar,
  timestamp,
  integer,
  index,
} from 'drizzle-orm/pg-core';

/**
 * Email OTPs table
 * 
 * Indexes:
 * - email_idx: For looking up OTPs by email
 * - expires_at_idx: For cleanup queries
 */
export const emailOtps = pgTable(
  'email_otps',
  {
    id: serial('id').primaryKey(),
    email: varchar('email', { length: 255 }).notNull(),
    otp_code: varchar('otp_code', { length: 6 }).notNull(),
    purpose: varchar('purpose', { length: 50 }).default('email_verification').notNull(),
    attempts: integer('attempts').default(0).notNull(),
    max_attempts: integer('max_attempts').default(3).notNull(),
    expires_at: timestamp('expires_at').notNull(),
    verified_at: timestamp('verified_at'),
    created_at: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    emailIdx: index('email_otps_email_idx').on(table.email),
    expiresAtIdx: index('email_otps_expires_at_idx').on(table.expires_at),
  })
);

// Export types
export type EmailOtp = typeof emailOtps.$inferSelect;
export type NewEmailOtp = typeof emailOtps.$inferInsert;
