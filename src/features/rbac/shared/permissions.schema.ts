/**
 * Permissions Table Schema
 */

import { pgTable, varchar, text, timestamp, uuid, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/**
 * Granular permissions table
 * Permission naming convention: resource:action (e.g., "users:read", "uploads:create")
 */
export const permissions = pgTable(
  'permissions',
  {
    id: uuid('id').primaryKey().default(sql`uuid_generate_v7()`),
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
