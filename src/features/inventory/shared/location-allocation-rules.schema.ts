/**
 * Location Allocation Rules Schema
 *
 * Defines rules for selecting which warehouse/location fulfills orders.
 * Supports multiple strategies: nearest, lowest cost, highest stock, manual, etc.
 */

import { pgTable, uuid, varchar, integer, boolean, jsonb, timestamp, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from '../../user/shared/user.schema';

export const locationAllocationRules = pgTable(
    'location_allocation_rules',
    {
        id: uuid('id').primaryKey().default(sql`uuid_generate_v7()`),

        // Rule metadata
        rule_name: varchar('rule_name', { length: 100 }).notNull(),
        priority: integer('priority').default(100).notNull(), // Lower = higher priority
        is_active: boolean('is_active').default(true).notNull(),

        // Conditions (JSON for flexibility)
        // Example: {"shipping_zone": "east", "product_category": "electronics"}
        conditions: jsonb('conditions').default({}).notNull(),

        // Allocation strategy
        strategy: varchar('strategy', { length: 50 }).default('nearest').notNull(),
        // Options: 'nearest', 'lowest_cost', 'highest_stock', 'round_robin', 'manual'

        // Target locations (ordered by preference)
        location_ids: uuid('location_ids').array().notNull(),

        // Fallback behavior
        fallback_strategy: varchar('fallback_strategy', { length: 50 }).default('any_available'),
        // Options: 'any_available', 'split_order', 'backorder', 'cancel'

        // Audit
        created_at: timestamp('created_at').defaultNow().notNull(),
        updated_at: timestamp('updated_at').defaultNow().notNull(),
        created_by: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
        updated_by: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
    },
    (table) => ({
        priorityPositive: check('priority_positive', sql`${table.priority} > 0`),
    })
);

export type LocationAllocationRule = typeof locationAllocationRules.$inferSelect;
export type NewLocationAllocationRule = typeof locationAllocationRules.$inferInsert;
