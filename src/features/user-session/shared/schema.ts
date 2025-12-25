import {
  pgTable,
  bigserial,
  timestamp,
  integer,
  varchar,
  text,
  index,
  boolean,
} from 'drizzle-orm/pg-core';

/**
 * User Sessions Schema
 * Track user login sessions across devices
 */

/**
 * User Sessions Table
 * Active and historical login sessions
 */
export const userSessions = pgTable(
  'user_sessions',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    user_id: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    
    // Session token
    session_token: varchar('session_token', { length: 255 }).notNull().unique(),
    refresh_token: varchar('refresh_token', { length: 255 }),
    
    // Device & location
    ip_address: varchar('ip_address', { length: 45 }),
    user_agent: text('user_agent'),
    device_type: varchar('device_type', { length: 50 }),
    device_name: varchar('device_name', { length: 255 }),
    browser: varchar('browser', { length: 100 }),
    os: varchar('os', { length: 100 }),
    
    // Location tracking
    country: varchar('country', { length: 100 }),
    city: varchar('city', { length: 100 }),
    
    // Session lifecycle
    is_active: boolean('is_active').default(true).notNull(),
    last_activity_at: timestamp('last_activity_at'),
    expires_at: timestamp('expires_at').notNull(),
    
    // Audit fields
    created_at: timestamp('created_at').defaultNow().notNull(),
    ended_at: timestamp('ended_at'),
  },
  (table) => ({
    userIdIdx: index('user_sessions_user_id_idx').on(table.user_id),
    sessionTokenIdx: index('user_sessions_session_token_idx').on(table.session_token),
    isActiveIdx: index('user_sessions_is_active_idx').on(table.is_active),
    expiresAtIdx: index('user_sessions_expires_at_idx').on(table.expires_at),
    lastActivityAtIdx: index('user_sessions_last_activity_at_idx').on(table.last_activity_at),
  })
);

// Export types
export type UserSession = typeof userSessions.$inferSelect;
export type NewUserSession = typeof userSessions.$inferInsert;

// Note: Temporary reference
const users = pgTable('users', {
  id: integer('id').primaryKey(),
});
