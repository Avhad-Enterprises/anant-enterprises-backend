/**
 * Role-Permissions Junction Table Schema
 */

import { pgTable, uuid, timestamp, primaryKey, index } from 'drizzle-orm/pg-core';
import { roles } from './roles.schema';
import { permissions } from './permissions.schema';
import { users } from '../../user/shared/user.schema';

/**
 * Many-to-many mapping between roles and permissions
 */
export const rolePermissions = pgTable(
  'role_permissions',
  {
    role_id: uuid('role_id')
      .references(() => roles.id, { onDelete: 'cascade' })
      .notNull(),
    permission_id: uuid('permission_id')
      .references(() => permissions.id, { onDelete: 'cascade' })
      .notNull(),
    assigned_by: uuid('assigned_by').references(() => users.id, { onDelete: 'set null' }),
    assigned_at: timestamp('assigned_at').defaultNow().notNull(),
  },
  table => ({
    pk: primaryKey({ columns: [table.role_id, table.permission_id] }),
    roleIdIdx: index('role_permissions_role_id_idx').on(table.role_id),
    permissionIdIdx: index('role_permissions_permission_id_idx').on(table.permission_id),
  })
);

export type RolePermission = typeof rolePermissions.$inferSelect;
export type NewRolePermission = typeof rolePermissions.$inferInsert;
