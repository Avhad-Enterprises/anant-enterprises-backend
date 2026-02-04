/**
 * Inventory Transfers Schema
 *
 * Tracks stock movements between physical locations (warehouses, stores, etc.)
 * Provides full audit trail for all transfers.
 */

import { pgTable, uuid, varchar, integer, timestamp, text, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { inventoryLocations } from './inventory-locations.schema';
import { products } from '../../product/shared/products.schema';
import { orders } from '../../orders/shared/orders.schema';
import { users } from '../../user/shared/user.schema';

export const inventoryTransfers = pgTable(
    'inventory_transfers',
    {
        id: uuid('id').primaryKey().default(sql`uuid_generate_v7()`),

        // Transfer metadata
        transfer_number: varchar('transfer_number', { length: 50 }).unique().notNull(),
        status: varchar('status', { length: 30 }).default('pending').notNull(),
        // Status: pending, in_transit, completed, cancelled

        // Locations
        from_location_id: uuid('from_location_id')
            .references(() => inventoryLocations.id, { onDelete: 'restrict' })
            .notNull(),
        to_location_id: uuid('to_location_id')
            .references(() => inventoryLocations.id, { onDelete: 'restrict' })
            .notNull(),

        // Product
        product_id: uuid('product_id')
            .references(() => products.id, { onDelete: 'restrict' })
            .notNull(),
        quantity: integer('quantity').notNull(),

        // Tracking
        shipment_tracking: varchar('shipment_tracking', { length: 200 }),
        shipped_at: timestamp('shipped_at'),
        received_at: timestamp('received_at'),
        completed_at: timestamp('completed_at'),
        cancelled_at: timestamp('cancelled_at'),

        // Reason
        reason: varchar('reason', { length: 50 }),
        // Common: 'rebalancing', 'customer_order', 'return', 'manual', 'damaged'
        notes: text('notes'),

        // Related records
        related_order_id: uuid('related_order_id').references(() => orders.id, { onDelete: 'set null' }),

        // Audit
        created_at: timestamp('created_at').defaultNow().notNull(),
        updated_at: timestamp('updated_at').defaultNow().notNull(),
        created_by: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
        updated_by: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
    },
    (table) => ({
        differentLocations: check(
            'transfer_different_locations',
            sql`${table.from_location_id} != ${table.to_location_id}`
        ),
        quantityPositive: check('transfer_quantity_positive', sql`${table.quantity} > 0`),
    })
);

export type InventoryTransfer = typeof inventoryTransfers.$inferSelect;
export type NewInventoryTransfer = typeof inventoryTransfers.$inferInsert;
