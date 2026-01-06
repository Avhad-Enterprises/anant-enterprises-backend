/**
 * Payment Webhook Logs Schema
 *
 * Stores raw webhook payloads from Razorpay for debugging, compliance, and replay capability.
 * This table is essential for:
 * - Auditing all payment events
 * - Debugging payment issues
 * - Idempotency checking (prevent duplicate processing)
 * - Compliance requirements
 */

import {
    pgTable,
    uuid,
    varchar,
    boolean,
    timestamp,
    jsonb,
    integer,
    index,
} from 'drizzle-orm/pg-core';

// ============================================
// PAYMENT WEBHOOK LOGS TABLE
// ============================================

export const paymentWebhookLogs = pgTable(
    'payment_webhook_logs',
    {
        // Identity
        id: uuid('id').primaryKey().defaultRandom(),

        // Event Identification (from Razorpay)
        event_id: varchar('event_id', { length: 100 }).unique(), // Razorpay's unique event ID
        event_type: varchar('event_type', { length: 100 }).notNull(), // e.g., 'payment.captured', 'refund.processed'

        // References (for quick lookups)
        razorpay_order_id: varchar('razorpay_order_id', { length: 50 }),
        razorpay_payment_id: varchar('razorpay_payment_id', { length: 50 }),

        // Full Payload (for debugging and replay)
        raw_payload: jsonb('raw_payload').notNull(),

        // Verification Status
        signature_verified: boolean('signature_verified').default(false).notNull(),

        // Processing Status
        processed: boolean('processed').default(false).notNull(),
        processed_at: timestamp('processed_at'),
        processing_error: varchar('processing_error', { length: 500 }),
        retry_count: integer('retry_count').default(0).notNull(),

        // Audit
        received_at: timestamp('received_at').defaultNow().notNull(),
    },
    table => ({
        // Indexes
        eventTypeIdx: index('webhook_logs_event_type_idx').on(table.event_type),
        razorpayOrderIdx: index('webhook_logs_rp_order_idx').on(table.razorpay_order_id),
        razorpayPaymentIdx: index('webhook_logs_rp_payment_idx').on(table.razorpay_payment_id),
        processedIdx: index('webhook_logs_processed_idx').on(table.processed),
        receivedAtIdx: index('webhook_logs_received_at_idx').on(table.received_at),
    })
);

// Types
export type PaymentWebhookLog = typeof paymentWebhookLogs.$inferSelect;
export type NewPaymentWebhookLog = typeof paymentWebhookLogs.$inferInsert;
