import {
  pgTable,
  serial,
  timestamp,
  boolean,
  integer,
  varchar,
  text,
  index,
  uniqueIndex,
  pgEnum,
} from 'drizzle-orm/pg-core';

/**
 * Admin Profiles Schema
 * Admin-specific employment data (1:1 with users who have admin roles via RBAC)
 * Permissions are managed through RBAC system, not stored here
 */

// Enums
export const adminDepartmentEnum = pgEnum('admin_department', [
  'sales',
  'support',
  'marketing',
  'operations',
  'finance',
  'it',
  'management',
  'other',
]);

export const adminLevelEnum = pgEnum('admin_level', [
  'junior',
  'senior',
  'lead',
  'manager',
  'director',
  'executive',
]);

/**
 * Admin Profiles Table
 * Admin-specific data and organizational hierarchy
 */
export const adminProfiles = pgTable(
  'admin_profiles',
  {
    id: serial('id').primaryKey(),
    user_id: integer('user_id')
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Personal information
    first_name: varchar('first_name', { length: 100 }).notNull(),
    middle_name: varchar('middle_name', { length: 100 }),
    last_name: varchar('last_name', { length: 100 }).notNull(),

    // Admin details
    employee_id: varchar('employee_id', { length: 20 }).unique(),
    department: adminDepartmentEnum('department'),
    level: adminLevelEnum('level').default('junior').notNull(),

    // Contact information
    work_phone: varchar('work_phone', { length: 30 }),
    emergency_contact_name: varchar('emergency_contact_name', { length: 150 }),
    emergency_contact_phone: varchar('emergency_contact_phone', { length: 30 }),

    // Employment details
    hire_date: timestamp('hire_date'),
    manager_user_id: integer('manager_user_id').references(() => users.id),

    // Notes and internal information
    internal_notes: text('internal_notes'),

    // Audit fields
    created_by: integer('created_by').references(() => users.id),
    updated_by: integer('updated_by').references(() => users.id),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
    is_deleted: boolean('is_deleted').default(false).notNull(),
    deleted_at: timestamp('deleted_at'),
    deleted_by: integer('deleted_by').references(() => users.id),
  },
  (table) => ({
    userIdIdx: uniqueIndex('admin_profiles_user_id_idx').on(table.user_id),
    employeeIdIdx: uniqueIndex('admin_profiles_employee_id_idx').on(table.employee_id),
    departmentIdx: index('admin_profiles_department_idx').on(table.department),
    levelIdx: index('admin_profiles_level_idx').on(table.level),
    managerIdx: index('admin_profiles_manager_idx').on(table.manager_user_id),
    createdAtIdx: index('admin_profiles_created_at_idx').on(table.created_at),
  })
);

// Export types
export type AdminProfile = typeof adminProfiles.$inferSelect;
export type NewAdminProfile = typeof adminProfiles.$inferInsert;

// Temporary reference
const users = pgTable('users', {
  id: integer('id').primaryKey(),
});
