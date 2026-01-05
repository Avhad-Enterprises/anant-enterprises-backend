/**
 * Order Items Schema
 *
 * Individual line items in an order.
 * Stores product snapshots (price, name, image) at time of purchase.
 */

import {
    pgTable,
    uuid,
    varchar,
    text,
    integer,
    decimal,
    timestamp,
    index,
    check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { orders } from './orders.schema';
import { products } from '../../product/shared/product.schema';

// ============================================
// ORDER ITEMS TABLE
// ============================================

export const orderItems = pgTable(
    'order_items',
    {
        // Identity
        id: uuid('id').primaryKey().defaultRandom(),
        order_id: uuid('order_id')
            .references(() => orders.id, { onDelete: 'cascade' })
            .notNull(),

        // Product Reference
        product_id: uuid('product_id')
            .references(() => products.id, { onDelete: 'set null' }),

        // Product Snapshot (frozen at purchase time)
        sku: varchar('sku', { length: 100 }),
        product_name: varchar('product_name', { length: 255 }).notNull(),
        product_image: text('product_image'),

        // Pricing
        cost_price: decimal('cost_price', { precision: 12, scale: 2 }).notNull(),
        quantity: integer('quantity').default(1).notNull(),
        line_total: decimal('line_total', { precision: 12, scale: 2 }).notNull(),

        // HIGH PRIORITY FIX #11: Fulfillment Tracking
        quantity_fulfilled: integer('quantity_fulfilled').default(0).notNull(),
        quantity_cancelled: integer('quantity_cancelled').default(0).notNull(),
        quantity_returned: integer('quantity_returned').default(0).notNull(),

        // Audit
        created_at: timestamp('created_at').defaultNow().notNull(),
        updated_at: timestamp('updated_at').defaultNow().notNull(),
    },
    table => ({
        orderIdIdx: index('order_items_order_id_idx').on(table.order_id),
        productIdIdx: index('order_items_product_id_idx').on(table.product_id),

        // PHASE 3 BATCH 5: CHECK CONSTRAINTS
        // Ensure quantity is positive
        quantityCheck: check('order_items_quantity_check',
            sql`quantity > 0`),
    })
);

// Types
export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;
