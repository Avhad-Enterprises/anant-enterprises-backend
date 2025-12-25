import {
  pgTable,
  bigserial,
  timestamp,
  boolean,
  integer,
  varchar,
  text,
  decimal,
  jsonb,
  index,
  pgEnum,
} from 'drizzle-orm/pg-core';

/**
 * Refunds Schema
 * Tracks refund requests and processing
 */

// Enums
export const refundReasonEnum = pgEnum('refund_reason', [
  'customer_request',
  'order_cancelled',
  'product_return',
  'duplicate_payment',
  'fraud',
  'other',
]);

export const refundStatusEnum = pgEnum('refund_status', [
  'pending',
  'processing',
  'completed',
  'failed',
  'cancelled',
]);

export const refundMethodEnum = pgEnum('refund_method', [
  'original_payment_method',
  'bank_transfer',
  'store_credit',
  'cash',
]);

/**
 * Refunds Table
 * Refund transactions for orders/payments
 */
export const refunds = pgTable(
  'refunds',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    
    // Reference
    refund_number: varchar('refund_number', { length: 50 }).notNull().unique(),
    order_id: integer('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    payment_transaction_id: integer('payment_transaction_id')
      .references(() => paymentTransactions.id, { onDelete: 'set null' })
      ,
    return_id: integer('return_id')
      .references(() => returns.id, { onDelete: 'set null' })
      ,
    
    // Refund details
    reason: refundReasonEnum('reason').notNull(),
    reason_description: text('reason_description'),
    method: refundMethodEnum('method').notNull(),
    status: refundStatusEnum('status').default('pending').notNull(),
    
    // Amounts
    amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).default('INR').notNull(),
    
    // Gateway details
    gateway_refund_id: varchar('gateway_refund_id', { length: 255 }),
    gateway_response: jsonb('gateway_response'),
    
    // Bank transfer details (if applicable)
    bank_account_number: varchar('bank_account_number', { length: 50 }),
    bank_ifsc: varchar('bank_ifsc', { length: 20 }),
    bank_account_holder: varchar('bank_account_holder', { length: 255 }),
    
    // Timestamps
    requested_at: timestamp('requested_at').defaultNow().notNull(),
    processed_at: timestamp('processed_at'),
    completed_at: timestamp('completed_at'),
    
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
    orderIdIdx: index('refunds_order_id_idx').on(table.order_id),
    paymentTransactionIdIdx: index('refunds_payment_transaction_id_idx').on(table.payment_transaction_id),
    returnIdIdx: index('refunds_return_id_idx').on(table.return_id),
    statusIdx: index('refunds_status_idx').on(table.status),
    reasonIdx: index('refunds_reason_idx').on(table.reason),
    requestedAtIdx: index('refunds_requested_at_idx').on(table.requested_at),
  })
);

// Export types
export type Refund = typeof refunds.$inferSelect;
export type NewRefund = typeof refunds.$inferInsert;

// Note: Temporary references
const orders = pgTable('orders', {
  id: integer('id').primaryKey(),
});

const paymentTransactions = pgTable('payment_transactions', {
  id: integer('id').primaryKey(),
});

const returns = pgTable('returns', {
  id: integer('id').primaryKey(),
});
