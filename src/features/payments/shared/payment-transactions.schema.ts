/**
 * Payment Transactions Schema
 *
 * Tracks all payment attempts and their state changes for Razorpay integration.
 * This is the primary audit table for payment reconciliation and debugging.
 *
 * Features:
 * - Complete payment lifecycle tracking (initiated → captured/failed)
 * - Razorpay reference storage for reconciliation
 * - Error tracking with detailed Razorpay error fields
 * - Refund tracking
 * - Idempotency support
 */

import {
    pgTable,
    uuid,
    varchar,
    decimal,
    boolean,
    timestamp,
    jsonb,
    pgEnum,
    index,
    check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { orders } from '../../orders/shared/orders.schema';

// ============================================
// ENUMS
// ============================================

export const paymentTransactionStatusEnum = pgEnum('payment_transaction_status', [
    'initiated', // Razorpay order created, awaiting payment
    'authorized', // Payment authorized (for 2-step capture flow)
    'captured', // Payment successfully captured
    'failed', // Payment failed
    'refund_initiated', // Refund requested
    'refunded', // Full refund processed
    'partially_refunded', // Partial refund processed
]);

// ============================================
// PAYMENT TRANSACTIONS TABLE
// ============================================

export const paymentTransactions = pgTable(
    'payment_transactions',
    {
        // Identity
        id: uuid('id').primaryKey().defaultRandom(),
        order_id: uuid('order_id')
            .references(() => orders.id, { onDelete: 'cascade' })
            .notNull(),

        // Razorpay References (Critical for reconciliation)
        razorpay_order_id: varchar('razorpay_order_id', { length: 50 }).notNull(),
        razorpay_payment_id: varchar('razorpay_payment_id', { length: 50 }),
        razorpay_signature: varchar('razorpay_signature', { length: 256 }),

        // Transaction Details
        amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
        currency: varchar('currency', { length: 3 }).default('INR').notNull(),
        status: paymentTransactionStatusEnum('status').default('initiated').notNull(),

        // Payment Method (populated after payment from Razorpay callback)
        payment_method: varchar('payment_method', { length: 50 }), // 'card', 'upi', 'netbanking', 'wallet'
        payment_method_details: jsonb('payment_method_details'), // Method-specific details

        // Error Tracking (for failed payments)
        error_code: varchar('error_code', { length: 50 }),
        error_description: varchar('error_description', { length: 500 }),
        error_source: varchar('error_source', { length: 50 }), // 'bank', 'gateway', 'customer'
        error_step: varchar('error_step', { length: 50 }), // 'payment_authorization', 'otp_verification'
        error_reason: varchar('error_reason', { length: 200 }),

        // Refund Tracking
        refund_id: varchar('refund_id', { length: 50 }),
        refund_amount: decimal('refund_amount', { precision: 12, scale: 2 }),
        refund_reason: varchar('refund_reason', { length: 200 }),
        refunded_at: timestamp('refunded_at'),

        // Webhook Verification
        webhook_verified: boolean('webhook_verified').default(false).notNull(),
        webhook_received_at: timestamp('webhook_received_at'),

        // Idempotency (prevent duplicate transactions)
        idempotency_key: varchar('idempotency_key', { length: 100 }).unique(),

        // Audit
        created_at: timestamp('created_at').defaultNow().notNull(),
        updated_at: timestamp('updated_at').defaultNow().notNull(),
        verified_at: timestamp('verified_at'),
    },
    table => ({
        // Indexes for performance
        orderIdIdx: index('payment_tx_order_id_idx').on(table.order_id),
        razorpayOrderIdIdx: index('payment_tx_rp_order_id_idx').on(table.razorpay_order_id),
        razorpayPaymentIdIdx: index('payment_tx_rp_payment_id_idx').on(table.razorpay_payment_id),
        statusIdx: index('payment_tx_status_idx').on(table.status),
        createdAtIdx: index('payment_tx_created_at_idx').on(table.created_at),

        // Constraints
        validAmount: check('payment_tx_valid_amount', sql`amount > 0`),
    })
);

// Types
export type PaymentTransaction = typeof paymentTransactions.$inferSelect;
export type NewPaymentTransaction = typeof paymentTransactions.$inferInsert;
