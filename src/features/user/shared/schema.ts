import { pgTable, serial, timestamp, boolean, integer, varchar, uuid, index } from 'drizzle-orm/pg-core';

/**
 * Users table schema
 * Stores user account information
 *
 * NOTE: Roles are now managed via the dynamic RBAC system (user_roles table)
 * NOTE: auth_id links to Supabase Auth (auth.users.id) - Migration 0006
 *
 * Indexes:
 * - email_is_deleted_idx: Composite index for email lookups (most queries filter by is_deleted)
 * - is_deleted_idx: Partial index for active user queries
 * - created_at_idx: For sorting/pagination
 * - auth_id_idx: For Supabase Auth lookups
 */
export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    auth_id: uuid('auth_id').unique(), // Links to Supabase Auth (auth.users.id)
    name: varchar('name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }).unique().notNull(),
    password: varchar('password', { length: 255 }), // Optional - Supabase Auth manages passwords
    phone_number: varchar('phone_number', { length: 20 }),

    // Audit fields - self-referential FKs added via raw SQL migration
    created_by: integer('created_by'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_by: integer('updated_by'),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
    is_deleted: boolean('is_deleted').default(false).notNull(),
    deleted_by: integer('deleted_by'),
    deleted_at: timestamp('deleted_at'),
  },
  table => ({
    // Composite index for email lookups (queries always filter by is_deleted)
    emailIsDeletedIdx: index('users_email_is_deleted_idx').on(table.email, table.is_deleted),
    // Index for sorting/pagination
    createdAtIdx: index('users_created_at_idx').on(table.created_at),
    // Index for Supabase Auth lookups
    authIdIdx: index('users_auth_id_idx').on(table.auth_id),
  })
);

// Export types for TypeScript
// Note: Use IUser from ./interface.ts as the canonical type for user objects
// User type is kept for Drizzle internal usage only
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
