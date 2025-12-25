import {
  pgTable,
  bigserial,
  timestamp,
  boolean,
  integer,
  varchar,
  text,
  decimal,
  index,
  pgEnum,
} from 'drizzle-orm/pg-core';

/**
 * Returns Schema
 * Manages product returns and RMA (Return Merchandise Authorization)
 */

// Enums
export const returnReasonEnum = pgEnum('return_reason', [
  'defective',
  'wrong_item',
  'not_as_described',
  'size_fit',
  'changed_mind',
  'damaged',
  'late_delivery',
  'other',
]);

export const returnStatusEnum = pgEnum('return_status', [
  'requested',
  'approved',
  'rejected',
  'received',
  'inspecting',
  'refunded',
  'exchanged',
  'cancelled',
]);

/**
 * Returns Table
 * RMA requests for order returns
 */
export const returns = pgTable(
  'returns',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    
    // Reference
    return_number: varchar('return_number', { length: 50 }).notNull().unique(),
    order_id: integer('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    
    // Customer info
    user_id: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
    
    // Return details
    reason: returnReasonEnum('reason').notNull(),
    reason_description: text('reason_description'),
    status: returnStatusEnum('status').default('requested').notNull(),
    
    // Resolution type
    resolution_type: varchar('resolution_type', { length: 50 }),
    
    // Amounts
    refund_amount: decimal('refund_amount', { precision: 12, scale: 2 }).default('0.00'),
    restocking_fee: decimal('restocking_fee', { precision: 12, scale: 2 }).default('0.00'),
    
    // Shipping
    return_shipping_carrier: varchar('return_shipping_carrier', { length: 100 }),
    return_tracking_number: varchar('return_tracking_number', { length: 100 }),
    
    // Timestamps
    requested_at: timestamp('requested_at').defaultNow().notNull(),
    approved_at: timestamp('approved_at'),
    received_at: timestamp('received_at'),
    refunded_at: timestamp('refunded_at'),
    
    // Notes
    admin_notes: text('admin_notes'),
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
    orderIdIdx: index('returns_order_id_idx').on(table.order_id),
    userIdIdx: index('returns_user_id_idx').on(table.user_id),
    statusIdx: index('returns_status_idx').on(table.status),
    reasonIdx: index('returns_reason_idx').on(table.reason),
    requestedAtIdx: index('returns_requested_at_idx').on(table.requested_at),
  })
);

/**
 * Return Items Table
 * Individual line items being returned
 */
export const returnItems = pgTable(
  'return_items',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    return_id: integer('return_id')
      .notNull()
      .references(() => returns.id, { onDelete: 'cascade' }),
    order_item_id: integer('order_item_id')
      .notNull()
      .references(() => orderItems.id, { onDelete: 'cascade' }),
    
    quantity: integer('quantity').notNull(),
    refund_amount: decimal('refund_amount', { precision: 12, scale: 2 }).notNull(),
    
    // Item condition
    condition: varchar('condition', { length: 100 }),
    notes: text('notes'),
    
    // Restocking
    restock: boolean('restock').default(true),
    restocked_at: timestamp('restocked_at'),
    
    // Audit fields
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    returnIdIdx: index('return_items_return_id_idx').on(table.return_id),
    orderItemIdIdx: index('return_items_order_item_id_idx').on(table.order_item_id),
  })
);

// Export types
export type Return = typeof returns.$inferSelect;
export type NewReturn = typeof returns.$inferInsert;
export type ReturnItem = typeof returnItems.$inferSelect;
export type NewReturnItem = typeof returnItems.$inferInsert;

// Note: Temporary references
const orders = pgTable('orders', {
  id: integer('id').primaryKey(),
});

const users = pgTable('users', {
  id: integer('id').primaryKey(),
});

const orderItems = pgTable('order_items', {
  id: integer('id').primaryKey(),
});
