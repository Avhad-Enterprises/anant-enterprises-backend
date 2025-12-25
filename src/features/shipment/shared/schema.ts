import {
  pgTable,
  bigserial,
  timestamp,
  boolean,
  integer,
  varchar,
  text,
  index,
  pgEnum,
} from 'drizzle-orm/pg-core';

/**
 * Shipments Schema
 * Tracks fulfillment packages and their contents
 */

// Enums
export const shipmentStatusEnum = pgEnum('shipment_status', [
  'pending',
  'packed',
  'shipped',
  'in_transit',
  'out_for_delivery',
  'delivered',
  'failed',
  'returned',
]);

export const shipmentMethodEnum = pgEnum('shipment_method', [
  'standard',
  'express',
  'overnight',
  'pickup',
  'dropshipping',
]);

/**
 * Shipments Table
 * Fulfillment packages (one order can have multiple shipments)
 */
export const shipments = pgTable(
  'shipments',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    
    // Reference
    shipment_number: varchar('shipment_number', { length: 50 }).notNull().unique(),
    order_id: integer('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    
    // Fulfillment location
    location_id: integer('location_id')
      .notNull()
      .references(() => inventoryLocations.id, { onDelete: 'restrict' })
      ,
    
    // Shipping details
    carrier: varchar('carrier', { length: 100 }),
    tracking_number: varchar('tracking_number', { length: 100 }),
    tracking_url: varchar('tracking_url', { length: 500 }),
    method: shipmentMethodEnum('method').default('standard').notNull(),
    
    // Status
    status: shipmentStatusEnum('status').default('pending').notNull(),
    
    // Timestamps
    packed_at: timestamp('packed_at'),
    shipped_at: timestamp('shipped_at'),
    estimated_delivery_at: timestamp('estimated_delivery_at'),
    delivered_at: timestamp('delivered_at'),
    
    // Notes
    notes: text('notes'),
    customer_note: text('customer_note'),
    
    // Audit fields
    created_by: integer('created_by'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_by: integer('updated_by'),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
    is_deleted: boolean('is_deleted').default(false).notNull(),
    deleted_by: integer('deleted_by'),
    deleted_at: timestamp('deleted_at'),
  },
  (table) => ({
    orderIdIdx: index('shipments_order_id_idx').on(table.order_id),
    locationIdIdx: index('shipments_location_id_idx').on(table.location_id),
    statusIdx: index('shipments_status_idx').on(table.status),
    trackingNumberIdx: index('shipments_tracking_number_idx').on(table.tracking_number),
    shippedAtIdx: index('shipments_shipped_at_idx').on(table.shipped_at),
  })
);

/**
 * Shipment Items Table
 * Line items included in each shipment
 */
export const shipmentItems = pgTable(
  'shipment_items',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    shipment_id: integer('shipment_id')
      .notNull()
      .references(() => shipments.id, { onDelete: 'cascade' }),
    order_item_id: integer('order_item_id')
      .notNull()
      .references(() => orderItems.id, { onDelete: 'cascade' }),
    
    quantity: integer('quantity').notNull(),
    
    // Audit fields
    created_at: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    shipmentIdIdx: index('shipment_items_shipment_id_idx').on(table.shipment_id),
    orderItemIdIdx: index('shipment_items_order_item_id_idx').on(table.order_item_id),
  })
);

// Export types
export type Shipment = typeof shipments.$inferSelect;
export type NewShipment = typeof shipments.$inferInsert;
export type ShipmentItem = typeof shipmentItems.$inferSelect;
export type NewShipmentItem = typeof shipmentItems.$inferInsert;

// Note: Temporary references
const orders = pgTable('orders', {
  id: integer('id').primaryKey(),
});

const inventoryLocations = pgTable('inventory_locations', {
  id: integer('id').primaryKey(),
});

const orderItems = pgTable('order_items', {
  id: integer('id').primaryKey(),
});
