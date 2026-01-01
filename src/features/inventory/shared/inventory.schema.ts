/**
 * Inventory Schema
 *
 * Core inventory tracking with shortage monitoring and status management.
 * Includes computed shortage_quantity column and auto-status updates.
 */

import {
    pgTable,
    uuid,
    varchar,
    integer,
    timestamp,
    pgEnum,
    index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { products } from '../../product/shared/product.schema';
import { inventoryLocations } from './inventory-locations.schema';

// ============================================
// ENUMS
// ============================================

export const inventoryStatusEnum = pgEnum('inventory_status', [
    'Enough Stock',
    'Shortage',
    'In Production',
    'Low Stock'
]);

// ============================================
// INVENTORY TABLE
// ============================================

export const inventory = pgTable(
    'inventory',
    {
        // Identity
        id: uuid('id').primaryKey().defaultRandom(),
        product_id: uuid('product_id')
            .references(() => products.id, { onDelete: 'cascade' })
            .notNull(),
        location_id: uuid('location_id')
            .references(() => inventoryLocations.id, { onDelete: 'cascade' })
            .notNull(),

        // Product Reference (denormalized for reporting performance)
        product_name: varchar('product_name', { length: 255 }).notNull(),
        sku: varchar('sku', { length: 100 }).notNull(),

        // Quantity Tracking
        required_quantity: integer('required_quantity').default(0).notNull(),
        available_quantity: integer('available_quantity').default(0).notNull(),

        // Computed Column: shortage_quantity = MAX(required - available, 0)
        // Note: Drizzle doesn't support GENERATED columns directly, so we'll use a custom SQL
        shortage_quantity: integer('shortage_quantity')
            .generatedAlwaysAs(
                sql`GREATEST(required_quantity - available_quantity, 0)`
            ),

        // Status (will be updated via application logic or triggers)
        status: inventoryStatusEnum('status').default('Enough Stock').notNull(),

        // Location (denormalized for quick access)
        location: varchar('location', { length: 255 }),

        // Tracking
        last_counted_at: timestamp('last_counted_at'),
        next_count_due: timestamp('next_count_due'),

        // Audit Fields
        created_at: timestamp('created_at').defaultNow().notNull(),
        updated_at: timestamp('updated_at').defaultNow().notNull(),
    },
    table => ({
        // Indexes
        productLocationIdx: index('inventory_product_location_idx').on(table.product_id, table.location_id),
        statusIdx: index('inventory_status_idx').on(table.status),
        shortageIdx: index('inventory_shortage_idx').on(table.shortage_quantity),
        skuIdx: index('inventory_sku_idx').on(table.sku),
    })
);

// Types
export type Inventory = typeof inventory.$inferSelect;
export type NewInventory = typeof inventory.$inferInsert;
