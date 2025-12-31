/**
 * RBAC Database Schemas
 *
 * Dynamic Role-Based Access Control tables:
 * - roles: Dynamic role definitions
 * - permissions: Granular permission definitions
 * - role_permissions: Many-to-many role <-> permission mapping
 * - user_roles: Many-to-many user <-> role mapping
 */

import {
  pgTable,
  serial,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  primaryKey,
  index,
} from 'drizzle-orm/pg-core';
import { users } from '../../user';

// ============================================
// ROLES TABLE
// ============================================

/**
 * Dynamic roles table
 * System roles (user, admin, superadmin) are marked with is_system_role=true
 * and cannot be deleted via API
 */
export const roles = pgTable(
  'roles',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 50 }).unique().notNull(),
    description: text('description'),
    is_system_role: boolean('is_system_role').default(false).notNull(),
    is_active: boolean('is_active').default(true).notNull(),
    // Audit fields
    created_by: integer('created_by'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_by: integer('updated_by'),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
    is_deleted: boolean('is_deleted').default(false).notNull(),
    deleted_by: integer('deleted_by'),
    deleted_at: timestamp('deleted_at'),
  },
  table => ({
    nameIdx: index('roles_name_idx').on(table.name),
    isActiveIdx: index('roles_is_active_idx').on(table.is_active, table.is_deleted),
  })
);

export type Role = typeof roles.$inferSelect;
export type NewRole = typeof roles.$inferInsert;

// ============================================
// PERMISSIONS TABLE
// ============================================

/**
 * Granular permissions table
 * Permission naming convention: resource:action (e.g., "users:read", "uploads:create")
 */
export const permissions = pgTable(
  'permissions',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 100 }).unique().notNull(), // e.g., "users:read"
    resource: varchar('resource', { length: 50 }).notNull(), // e.g., "users"
    action: varchar('action', { length: 50 }).notNull(), // e.g., "read"
    description: text('description'),
    created_at: timestamp('created_at').defaultNow().notNull(),
  },
  table => ({
    resourceIdx: index('permissions_resource_idx').on(table.resource),
    resourceActionIdx: index('permissions_resource_action_idx').on(table.resource, table.action),
  })
);

export type Permission = typeof permissions.$inferSelect;
export type NewPermission = typeof permissions.$inferInsert;

// ============================================
// ROLE_PERMISSIONS TABLE (Junction)
// ============================================

/**
 * Many-to-many mapping between roles and permissions
 */
export const rolePermissions = pgTable(
  'role_permissions',
  {
    role_id: integer('role_id')
      .references(() => roles.id, { onDelete: 'cascade' })
      .notNull(),
    permission_id: integer('permission_id')
      .references(() => permissions.id, { onDelete: 'cascade' })
      .notNull(),
    assigned_by: integer('assigned_by').references(() => users.id),
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

// ============================================
// USER_ROLES TABLE (Junction)
// ============================================

/**
 * Many-to-many mapping between users and roles
 * Supports optional role expiration via expires_at
 */
export const userRoles = pgTable(
  'user_roles',
  {
    user_id: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    role_id: integer('role_id')
      .references(() => roles.id, { onDelete: 'cascade' })
      .notNull(),
    assigned_by: integer('assigned_by').references(() => users.id),
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
