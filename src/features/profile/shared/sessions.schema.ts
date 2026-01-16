/**
 * Sessions Schema
 *
 * Tracks active user sessions for security monitoring
 * Multiple sessions per user (different devices/browsers)
 */

import { pgTable, varchar, uuid, timestamp, index, inet } from 'drizzle-orm/pg-core';
import { users } from '../../user/shared/user.schema';

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    user_id: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),

    // Session info
    session_token: varchar('session_token', { length: 255 }).unique().notNull(),

    // Device & browser info
    device_type: varchar('device_type', { length: 50 }), // Desktop, Mobile, Tablet
    browser: varchar('browser', { length: 100 }), // Chrome, Firefox, Safari, etc.
    operating_system: varchar('operating_system', { length: 100 }),

    // Location info
    ip_address: inet('ip_address'),
    location: varchar('location', { length: 200 }), // City, Country

    // Activity tracking
    last_active: timestamp('last_active').defaultNow().notNull(),
    created_at: timestamp('created_at').defaultNow().notNull(),
    expires_at: timestamp('expires_at').notNull(),
  },
  table => ({
    userIdIdx: index('sessions_user_id_idx').on(table.user_id),
    sessionTokenIdx: index('sessions_token_idx').on(table.session_token),
    expiresAtIdx: index('sessions_expires_at_idx').on(table.expires_at),
    lastActiveIdx: index('sessions_last_active_idx').on(table.last_active),
  })
);

// Export types for TypeScript
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
