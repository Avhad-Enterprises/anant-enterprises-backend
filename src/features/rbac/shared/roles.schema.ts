/**
 * Roles Table Schema
 */

import { pgTable, varchar, text, boolean, timestamp, uuid, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/**
 * Dynamic roles table
 * System roles (user, admin, superadmin) are marked with is_system_role=true
 * and cannot be deleted via API
 */
export const roles = pgTable(
  'roles',
  {
    id: uuid('id').primaryKey().default(sql`uuid_generate_v7()`),
    name: varchar('name', { length: 50 }).unique().notNull(),
    description: text('description'),
    is_system_role: boolean('is_system_role').default(false).notNull(),
    is_active: boolean('is_active').default(true).notNull(),
    // Audit fields
    created_by: uuid('created_by'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_by: uuid('updated_by'),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
    is_deleted: boolean('is_deleted').default(false).notNull(),
    deleted_by: uuid('deleted_by'),
    deleted_at: timestamp('deleted_at'),
  },
  table => ({
    nameIdx: index('roles_name_idx').on(table.name),
    isActiveIdx: index('roles_is_active_idx').on(table.is_active, table.is_deleted),
  })
);

export type Role = typeof roles.$inferSelect;
export type NewRole = typeof roles.$inferInsert;
