/**
 * Audit Logs Database Schema
 * 
 * Central table for storing all audit events in the system.
 * Tracks who did what, when, and captures before/after states.
 */

import {
    pgTable,
    serial,
    varchar,
    text,
    integer,
    timestamp,
    jsonb,
    index,
} from 'drizzle-orm/pg-core';
import { users } from '../../user/shared/schema';

/**
 * Audit logs table - comprehensive audit trail for all system operations
 * 
 * Indexes optimized for common query patterns:
 * - Timestamp for chronological queries
 * - User ID for user activity queries
 * - Resource type + ID for resource audit trails
 * - Action for filtering by operation type
 */
export const auditLogs = pgTable(
    'audit_logs',
    {
        id: serial('id').primaryKey(),
        timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow().notNull(),

        // Who performed the action
        user_id: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
        user_email: varchar('user_email', { length: 255 }), // Historical reference
        user_role: varchar('user_role', { length: 100 }), // Contextual information

        // What action was performed
        action: varchar('action', { length: 100 }).notNull(), // e.g., 'USER_CREATE', 'LOGIN', etc.
        resource_type: varchar('resource_type', { length: 100 }).notNull(), // e.g., 'USER', 'ROLE', etc.
        resource_id: integer('resource_id'), // ID of the affected resource (nullable for system events)

        // Before/After state (JSON for flexibility)
        old_values: jsonb('old_values'), // Previous state
        new_values: jsonb('new_values'), // New state

        // Context information
        ip_address: varchar('ip_address', { length: 45 }), // IPv6 support (45 chars)
        user_agent: text('user_agent'),
        session_id: varchar('session_id', { length: 255 }),

        // Additional metadata
        metadata: jsonb('metadata'), // Extra context (order total, etc.)
        reason: text('reason'), // Optional reason for the change

        // Audit trail
        created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    },
    (table) => ({
        // Indexes for common query patterns
        timestampIdx: index('audit_logs_timestamp_idx').on(table.timestamp.desc()),
        userIdIdx: index('audit_logs_user_id_idx').on(table.user_id),
        resourceIdx: index('audit_logs_resource_idx').on(table.resource_type, table.resource_id),
        actionIdx: index('audit_logs_action_idx').on(table.action),
        createdAtIdx: index('audit_logs_created_at_idx').on(table.created_at.desc()),
    })
);

// Export types for TypeScript
export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
