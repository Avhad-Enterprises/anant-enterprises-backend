/**
 * Inventory Adjustments Schema
 *
 * Complete audit trail for all inventory changes.
 * Records every stock adjustment with before/after snapshots.
 */

import {
    pgTable,
    uuid,
    varchar,
    text,
    integer,
    timestamp,
    pgEnum,
    index,
} from 'drizzle-orm/pg-core';
import { inventory } from './inventory.schema';
import { users } from '../../user/shared/user.schema';

// ============================================
// ENUMS
// ============================================

export const adjustmentTypeEnum = pgEnum('adjustment_type', [
    'increase',
    'decrease',
    'correction',
    'write-off'
]);

export const approvalStatusEnum = pgEnum('approval_status', [
    'pending',
    'approved',
    'rejected'
]);

// ============================================
// INVENTORY ADJUSTMENTS TABLE
// ============================================

export const inventoryAdjustments = pgTable(
    'inventory_adjustments',
    {
        // Identity
        id: uuid('id').primaryKey().defaultRandom(),
        inventory_id: uuid('inventory_id')
            .references(() => inventory.id, { onDelete: 'cascade' })
            .notNull(),

        // Adjustment Details
        adjustment_type: adjustmentTypeEnum('adjustment_type').notNull(),
        quantity_change: integer('quantity_change').notNull(), // Can be positive or negative

        // Context
        reason: varchar('reason', { length: 500 }).notNull(), // Required explanation
        reference_number: varchar('reference_number', { length: 100 }), // PO, invoice, etc.

        // Snapshots (for audit integrity)
        quantity_before: integer('quantity_before').notNull(),
        quantity_after: integer('quantity_after').notNull(),

        // Who & When
        adjusted_by: uuid('adjusted_by')
            .references(() => users.id, { onDelete: 'set null' })
            .notNull(),
        adjusted_at: timestamp('adjusted_at').defaultNow().notNull(),

        // Approval Workflow (optional)
        approved_by: uuid('approved_by')
            .references(() => users.id, { onDelete: 'set null' }),
        approved_at: timestamp('approved_at'),
        approval_status: approvalStatusEnum('approval_status').default('approved').notNull(),

        // Additional Notes
        notes: text('notes'),
    },
    table => ({
        // Indexes
        inventoryAdjustedIdx: index('inventory_adjustments_inventory_adjusted_idx')
            .on(table.inventory_id, table.adjusted_at),
        adjustedByIdx: index('inventory_adjustments_adjusted_by_idx').on(table.adjusted_by),
        adjustmentTypeIdx: index('inventory_adjustments_type_idx').on(table.adjustment_type),
    })
);

// Types
export type InventoryAdjustment = typeof inventoryAdjustments.$inferSelect;
export type NewInventoryAdjustment = typeof inventoryAdjustments.$inferInsert;
