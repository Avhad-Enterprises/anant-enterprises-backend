import {
  pgTable,
  bigserial,
  timestamp,
  integer,
  varchar,
  index,
  pgEnum,
} from 'drizzle-orm/pg-core';

/**
 * Order Addresses Schema
 * Stores snapshot of billing/shipping addresses at order time
 */

// Enums
export const addressTypeEnum = pgEnum('address_type', ['billing', 'shipping']);

/**
 * Order Addresses Table
 * Immutable address snapshot for each order
 */
export const orderAddresses = pgTable(
  'order_addresses',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    order_id: integer('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    
    type: addressTypeEnum('type').notNull(),
    
    // Recipient info
    first_name: varchar('first_name', { length: 100 }).notNull(),
    last_name: varchar('last_name', { length: 100 }).notNull(),
    phone: varchar('phone', { length: 30 }).notNull(),
    email: varchar('email', { length: 190 }),
    company: varchar('company', { length: 255 }),
    
    // Address
    address_line1: varchar('address_line1', { length: 255 }).notNull(),
    address_line2: varchar('address_line2', { length: 255 }),
    landmark: varchar('landmark', { length: 255 }),
    city: varchar('city', { length: 100 }).notNull(),
    state: varchar('state', { length: 100 }).notNull(),
    postal_code: varchar('postal_code', { length: 20 }).notNull(),
    country: varchar('country', { length: 100 }).notNull().default('India'),
    
    // Tax info (for billing addresses)
    gstin: varchar('gstin', { length: 20 }),
    
    // Audit fields
    created_at: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    orderIdIdx: index('order_addresses_order_id_idx').on(table.order_id),
    typeIdx: index('order_addresses_type_idx').on(table.type),
  })
);

// Export types
export type OrderAddress = typeof orderAddresses.$inferSelect;
export type NewOrderAddress = typeof orderAddresses.$inferInsert;

// Note: Temporary reference
const orders = pgTable('orders', {
  id: integer('id').primaryKey(),
});
