/**
 * Cart Items Schema
 *
 * Individual line items in a shopping cart.
 * Supports both products and bundles with price snapshots.
 */

import {
    pgTable,
    uuid,
    varchar,
    text,
    integer,
    decimal,
    boolean,
    timestamp,
    jsonb,
    index,
    check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { carts } from './carts.schema';
import { products } from '../../product/shared/product.schema';
import { bundles } from '../../bundles/shared/bundles.schema';

// ============================================
// CART ITEMS TABLE
// ============================================

export const cartItems = pgTable(
    'cart_items',
    {
        // Identity
        id: uuid('id').primaryKey().defaultRandom(),
        cart_id: uuid('cart_id')
            .references(() => carts.id, { onDelete: 'cascade' })
            .notNull(),

        // Product Reference (either product_id OR bundle_id)
        product_id: uuid('product_id')
            .references(() => products.id, { onDelete: 'set null' }),
        bundle_id: uuid('bundle_id')
            .references(() => bundles.id, { onDelete: 'set null' }),

        // Quantity
        quantity: integer('quantity').default(1).notNull(),

        // Pricing (snapshot at time of adding to cart)
        cost_price: decimal('cost_price', { precision: 12, scale: 2 }).notNull(),
        final_price: decimal('final_price', { precision: 12, scale: 2 }).notNull(),
        discount_amount: decimal('discount_amount', { precision: 12, scale: 2 }).default('0.00').notNull(),

        // Line Totals
        line_subtotal: decimal('line_subtotal', { precision: 12, scale: 2 }).notNull(),
        line_total: decimal('line_total', { precision: 12, scale: 2 }).notNull(),

        // Product Snapshot (denormalized for abandoned cart emails)
        product_name: varchar('product_name', { length: 255 }),
        product_image_url: text('product_image_url'),
        product_sku: varchar('product_sku', { length: 100 }),

        // Customization
        customization_data: jsonb('customization_data').default({}),

        // HIGH PRIORITY FIX #10: Inventory Reservation
        reserved_from_location_id: uuid('reserved_from_location_id'), // FK to inventory_locations
        reserved_at: timestamp('reserved_at'),

        // HIGH PRIORITY FIX #22: Bundle Snapshot (if bundle_id is set)
        bundle_snapshot: jsonb('bundle_snapshot').default(null), // Store bundle contents at time of adding

        // Audit Fields
        created_at: timestamp('created_at').defaultNow().notNull(),
        updated_at: timestamp('updated_at').defaultNow().notNull(),
        is_deleted: boolean('is_deleted').default(false).notNull(),
        deleted_at: timestamp('deleted_at'),
    },
    table => ({
        // Indexes
        cartIdIdx: index('cart_items_cart_id_idx').on(table.cart_id),
        productIdIdx: index('cart_items_product_id_idx').on(table.product_id),
        bundleIdIdx: index('cart_items_bundle_id_idx').on(table.bundle_id),

        // PHASE 3 BATCH 5: CHECK CONSTRAINTS
        // Ensure quantity is positive
        quantityCheck: check('cart_items_quantity_check',
            sql`quantity > 0`),
    })
);

// Types
export type CartItem = typeof cartItems.$inferSelect;
export type NewCartItem = typeof cartItems.$inferInsert;
