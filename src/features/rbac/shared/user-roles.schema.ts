/**
 * User-Roles Junction Table Schema
 */

import { pgTable, uuid, timestamp, primaryKey, index } from 'drizzle-orm/pg-core';
import { users } from '../../user/shared/user.schema';
import { roles } from './roles.schema';

/**
 * Many-to-many mapping between users and roles
 * Supports optional role expiration via expires_at
 */
export const userRoles = pgTable(
  'user_roles',
  {
    user_id: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    role_id: uuid('role_id')
      .references(() => roles.id, { onDelete: 'cascade' })
      .notNull(),
    assigned_by: uuid('assigned_by').references(() => users.id),
    assigned_at: timestamp('assigned_at').defaultNow().notNull(),
    expires_at: timestamp('expires_at'), // Optional: role expiration
  },
  table => ({
    pk: primaryKey({ columns: [table.user_id, table.role_id] }),
    userIdIdx: index('user_roles_user_id_idx').on(table.user_id),
    roleIdIdx: index('user_roles_role_id_idx').on(table.role_id),
    expiresAtIdx: index('user_roles_expires_at_idx').on(table.expires_at),
  })
);

export type UserRole = typeof userRoles.$inferSelect;
export type NewUserRole = typeof userRoles.$inferInsert;
