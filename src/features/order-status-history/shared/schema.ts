import {
  pgTable,
  bigserial,
  timestamp,
  integer,
  varchar,
  text,
  index,
  pgEnum,
  boolean,
} from 'drizzle-orm/pg-core';

/**
 * Order Status History Schema
 * Tracks all status changes for orders and line items
 */

// Enums
export const statusTypeEnum = pgEnum('status_type', ['payment', 'fulfillment', 'custom']);

/**
 * Order Status History Table
 * Audit trail of order status changes
 */
export const orderStatusHistory = pgTable(
  'order_status_history',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    order_id: integer('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    
    // Status info
    status_type: statusTypeEnum('status_type').notNull(),
    from_status: varchar('from_status', { length: 60 }),
    to_status: varchar('to_status', { length: 60 }).notNull(),
    
    // Details
    comment: text('comment'),
    notify_customer: boolean('notify_customer').default(false),
    
    // Audit fields
    created_by: integer('created_by'),
    created_at: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    orderIdIdx: index('order_status_history_order_id_idx').on(table.order_id),
    statusTypeIdx: index('order_status_history_status_type_idx').on(table.status_type),
    createdAtIdx: index('order_status_history_created_at_idx').on(table.created_at),
  })
);

// Export types
export type OrderStatusHistory = typeof orderStatusHistory.$inferSelect;
export type NewOrderStatusHistory = typeof orderStatusHistory.$inferInsert;

// Note: Temporary reference
const orders = pgTable('orders', {
  id: integer('id').primaryKey(),
});
