import {
  pgTable,
  bigserial,
  timestamp,
  integer,
  varchar,
  text,
  decimal,
  jsonb,
  index,
  pgEnum,
} from 'drizzle-orm/pg-core';

/**
 * Order Items Schema
 * Individual line items within an order
 */

// Enums
export const orderItemFulfillmentStatusEnum = pgEnum('order_item_fulfillment_status', [
  'unfulfilled',
  'partial',
  'fulfilled',
  'returned',
  'cancelled',
]);

/**
 * Order Items Table
 * Represents each product/variant in an order
 */
export const orderItems = pgTable(
  'order_items',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    order_id: integer('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    
    // Product reference
    product_id: integer('product_id').notNull(),
    variant_id: integer('variant_id'),
    
    // Product snapshot at order time
    product_title: varchar('product_title', { length: 255 }).notNull(),
    variant_title: varchar('variant_title', { length: 255 }),
    sku: varchar('sku', { length: 100 }).notNull(),
    
    // Quantities
    quantity: integer('quantity').notNull().default(1),
    quantity_fulfilled: integer('quantity_fulfilled').default(0).notNull(),
    quantity_returned: integer('quantity_returned').default(0).notNull(),
    
    // Pricing
    unit_price: decimal('unit_price', { precision: 12, scale: 2 }).notNull(),
    total_price: decimal('total_price', { precision: 12, scale: 2 }).notNull(),
    
    // Discounts
    discount_amount: decimal('discount_amount', { precision: 12, scale: 2 }).default('0.00').notNull(),
    discount_code: varchar('discount_code', { length: 80 }),
    
    // Tax
    tax_rate: decimal('tax_rate', { precision: 5, scale: 2 }),
    tax_amount: decimal('tax_amount', { precision: 12, scale: 2 }).default('0.00').notNull(),
    
    // Total after discount & tax
    final_amount: decimal('final_amount', { precision: 12, scale: 2 }).notNull(),
    
    // Customizations & Add-ons (stored as JSONB)
    customization_data: jsonb('customization_data'),
    
    // Fulfillment
    fulfillment_status: orderItemFulfillmentStatusEnum('fulfillment_status')
      .default('unfulfilled')
      .notNull(),
    location_id: integer('location_id'),
    
    // Additional info
    notes: text('notes'),
    
    // Audit fields
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    orderIdIdx: index('order_items_order_id_idx').on(table.order_id),
    productIdIdx: index('order_items_product_id_idx').on(table.product_id),
    variantIdIdx: index('order_items_variant_id_idx').on(table.variant_id),
    fulfillmentStatusIdx: index('order_items_fulfillment_status_idx').on(table.fulfillment_status),
    locationIdIdx: index('order_items_location_id_idx').on(table.location_id),
  })
);

// Export types
export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;

// Note: Temporary reference
const orders = pgTable('orders', {
  id: integer('id').primaryKey(),
});
