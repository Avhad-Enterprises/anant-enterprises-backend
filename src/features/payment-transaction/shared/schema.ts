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
 * Payment Transactions Schema
 * Tracks all payment attempts, successes, and failures
 */

// Enums
export const paymentMethodEnum = pgEnum('payment_method', [
  'card',
  'upi',
  'netbanking',
  'wallet',
  'cod',
  'emi',
  'bank_transfer',
]);

export const paymentStatusEnum = pgEnum('payment_status', [
  'pending',
  'processing',
  'authorized',
  'captured',
  'partially_refunded',
  'refunded',
  'failed',
  'cancelled',
]);

export const paymentGatewayEnum = pgEnum('payment_gateway', [
  'razorpay',
  'stripe',
  'paytm',
  'phonepe',
  'paypal',
  'manual',
]);

/**
 * Payment Transactions Table
 * Complete audit trail of all payment events
 */
export const paymentTransactions = pgTable(
  'payment_transactions',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    
    // Reference
    transaction_id: varchar('transaction_id', { length: 100 }).notNull().unique(),
    order_id: integer('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    user_id: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
    
    // Payment details
    method: paymentMethodEnum('method').notNull(),
    gateway: paymentGatewayEnum('gateway').notNull(),
    status: paymentStatusEnum('status').default('pending').notNull(),
    
    // Amounts
    amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).default('INR').notNull(),
    
    // Gateway references
    gateway_transaction_id: varchar('gateway_transaction_id', { length: 255 }),
    gateway_payment_id: varchar('gateway_payment_id', { length: 255 }),
    gateway_order_id: varchar('gateway_order_id', { length: 255 }),
    
    // Gateway response
    gateway_response: jsonb('gateway_response'),
    error_code: varchar('error_code', { length: 100 }),
    error_message: text('error_message'),
    
    // Card details (last 4 digits, brand)
    card_last4: varchar('card_last4', { length: 4 }),
    card_brand: varchar('card_brand', { length: 50 }),
    card_network: varchar('card_network', { length: 50 }),
    
    // Bank details (for netbanking/UPI)
    bank_name: varchar('bank_name', { length: 100 }),
    upi_id: varchar('upi_id', { length: 100 }),
    
    // Timestamps
    initiated_at: timestamp('initiated_at').defaultNow().notNull(),
    authorized_at: timestamp('authorized_at'),
    captured_at: timestamp('captured_at'),
    failed_at: timestamp('failed_at'),
    
    // Security
    ip_address: varchar('ip_address', { length: 45 }),
    user_agent: text('user_agent'),
    
    // Notes
    notes: text('notes'),
    
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
    orderIdIdx: index('payment_transactions_order_id_idx').on(table.order_id),
    userIdIdx: index('payment_transactions_user_id_idx').on(table.user_id),
    statusIdx: index('payment_transactions_status_idx').on(table.status),
    methodIdx: index('payment_transactions_method_idx').on(table.method),
    gatewayIdx: index('payment_transactions_gateway_idx').on(table.gateway),
    gatewayTransactionIdIdx: index('payment_transactions_gateway_transaction_id_idx').on(
      table.gateway_transaction_id
    ),
    initiatedAtIdx: index('payment_transactions_initiated_at_idx').on(table.initiated_at),
  })
);

// Export types
export type PaymentTransaction = typeof paymentTransactions.$inferSelect;
export type NewPaymentTransaction = typeof paymentTransactions.$inferInsert;

// Note: Temporary references
const orders = pgTable('orders', {
  id: integer('id').primaryKey(),
});

const users = pgTable('users', {
  id: integer('id').primaryKey(),
});
