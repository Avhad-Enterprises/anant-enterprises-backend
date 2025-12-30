/**
 * Admin Profiles Schema
 *
 * Minimal admin/staff data for organizational structure.
 * All permissions managed via RBAC system.
 *
 * Simplified: Removed permission overrides, capability flags, limits, and 2FA
 * (all handled by RBAC or authentication systems)
 */

import {
    pgTable,
    serial,
    varchar,
    boolean,
    integer,
    timestamp,
    index,
} from 'drizzle-orm/pg-core';
import { users } from './schema';

// ============================================
// ADMIN PROFILES TABLE
// ============================================

/**
 * Admin profiles for staff users
 * One-to-one relationship with users table
 * Permissions managed via RBAC
 */
export const adminProfiles = pgTable(
    'admin_profiles',
    {
        id: serial('id').primaryKey(),
        user_id: integer('user_id')
            .references(() => users.id, { onDelete: 'cascade' })
            .unique()
            .notNull(),

        // Employee info
        employee_id: varchar('employee_id', { length: 50 }).unique(), // Company employee ID
        department: varchar('department', { length: 100 }), // Sales, Support, Inventory, Finance
        job_title: varchar('job_title', { length: 100 }), // Manager, Executive, etc.

        // Status
        is_active: boolean('is_active').default(true).notNull(),

        // Audit fields
        created_at: timestamp('created_at').defaultNow().notNull(),
        updated_at: timestamp('updated_at').defaultNow().notNull(),
        is_deleted: boolean('is_deleted').default(false).notNull(),
    },
    (table) => ({
        // Department filtering
        departmentIdx: index('admin_profiles_department_idx').on(table.department, table.is_active),
        // Active admins
        isActiveIdx: index('admin_profiles_is_active_idx').on(table.is_active, table.is_deleted),
        // Employee ID lookup
        employeeIdIdx: index('admin_profiles_employee_id_idx').on(table.employee_id),
    })
);

// Export types for TypeScript
export type AdminProfile = typeof adminProfiles.$inferSelect;
export type NewAdminProfile = typeof adminProfiles.$inferInsert;
