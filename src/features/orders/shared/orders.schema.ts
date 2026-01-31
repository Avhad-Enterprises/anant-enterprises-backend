/**
 * Orders Schema
 *
 * Unified orders system where draft orders (admin-created quotes) and confirmed orders
 * are stored in the same table, distinguished by the is_draft flag.
 *
 * Features:
 * - Complete payment tracking (pending → paid → refunded)
 * - India-specific: GST breakdown, COD support
 * - Fulfillment status tracking
 * - Multi-channel support (web, app, POS, marketplace)
 */

import {
  pgTable,
  uuid,
  varchar,
  integer,
  decimal,
  boolean,
  timestamp,
  jsonb,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from '../../user/shared/user.schema';
import { userAddresses } from '../../user/shared/addresses.schema';
import { carts } from '../../cart/shared/carts.schema';
// COMMENTED OUT - Tables dropped (31 Jan 2026)
// import { discounts } from '../../discount/shared/discount.schema';
// import { discountCodes } from '../../discount/shared/discount-codes.schema';
// import { taxRules } from '../../settings/shared/tax-rules.schema';

// ============================================
// ENUMS
// ============================================

export const orderChannelEnum = pgEnum('order_channel', [
  'web',
  'app',
  'pos',
  'marketplace',
  'other',
]);

export const paymentStatusEnum = pgEnum('payment_status', [
  'pending',
  'paid',
  'refunded',
  'failed',
  'partially_refunded',
]);

export const orderDiscountTypeEnum = pgEnum('order_discount_type', ['percent', 'amount', 'none']);

// HIGH PRIORITY FIX #9: Overall order status
export const orderStatusEnum = pgEnum('order_status', [
  'pending', // Order created, awaiting payment
  'confirmed', // Payment received
  'processing', // Being prepared
  'shipped', // On the way
  'delivered', // Completed successfully
  'cancelled', // Cancelled by customer/admin
  'refunded', // Money returned
  'returned', // Item returned by customer
]);

export const fulfillmentStatusEnum = pgEnum('fulfillment_status', [
  'unfulfilled',
  'partial',
  'fulfilled',
  'returned',
  'cancelled',
]);

// ============================================
// ORDERS TABLE
// ============================================

export const orders = pgTable(
  'orders',
  {
    // Identity
    id: uuid('id').primaryKey().default(sql`uuid_generate_v7()`),
    order_number: varchar('order_number', { length: 40 }).unique().notNull(),

    // Relationships
    user_id: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    cart_id: uuid('cart_id').references(() => carts.id, { onDelete: 'set null' }),

    // Addresses (CRITICAL FIX #1)
    shipping_address_id: uuid('shipping_address_id').references(() => userAddresses.id, {
      onDelete: 'set null',
    }),
    billing_address_id: uuid('billing_address_id').references(() => userAddresses.id, {
      onDelete: 'set null',
    }),

    // Source
    channel: orderChannelEnum('channel').default('web').notNull(),

    // HIGH PRIORITY FIX #9: Overall order status
    order_status: orderStatusEnum('order_status').default('pending').notNull(),

    // Draft Order Flag
    is_draft: boolean('is_draft').default(false).notNull(),

    // Payment
    payment_method: varchar('payment_method', { length: 60 }),
    payment_status: paymentStatusEnum('payment_status').default('pending').notNull(),
    payment_ref: varchar('payment_ref', { length: 120 }),
    transaction_id: varchar('transaction_id', { length: 120 }),
    paid_at: timestamp('paid_at'),
    currency: varchar('currency', { length: 3 }).default('INR').notNull(),

    // Razorpay Integration
    razorpay_order_id: varchar('razorpay_order_id', { length: 50 }),
    payment_link_expires_at: timestamp('payment_link_expires_at'),
    payment_attempts: integer('payment_attempts').default(0).notNull(),
    last_payment_error: varchar('last_payment_error', { length: 500 }),

    // Pricing
    subtotal: decimal('subtotal', { precision: 12, scale: 2 }).default('0.00').notNull(),

    // Discounts (CRITICAL FIX #4)
    // COMMENTED OUT - Foreign keys to dropped tables (31 Jan 2026)
    // discount_id: uuid('discount_id').references(() => discounts.id, { onDelete: 'set null' }),
    // discount_code_id: varchar('discount_code_id', { length: 50 }).references(
    //   () => discountCodes.code,
    //   { onDelete: 'set null' }
    // ),
    discount_id: uuid('discount_id'), // FK removed - discounts table dropped
    discount_code_id: varchar('discount_code_id', { length: 50 }), // FK removed - discount_codes table dropped
    discount_type: orderDiscountTypeEnum('discount_type').default('none').notNull(),
    discount_value: decimal('discount_value', { precision: 12, scale: 2 })
      .default('0.00')
      .notNull(),
    discount_amount: decimal('discount_amount', { precision: 12, scale: 2 })
      .default('0.00')
      .notNull(),
    discount_code: varchar('discount_code', { length: 80 }), // Denormalized for display

    // Gift Cards
    giftcard_code: varchar('giftcard_code', { length: 80 }),
    giftcard_amount: decimal('giftcard_amount', { precision: 12, scale: 2 })
      .default('0.00')
      .notNull(),

    // Shipping
    shipping_method: varchar('shipping_method', { length: 120 }),
    shipping_option: varchar('shipping_option', { length: 120 }),
    shipping_amount: decimal('shipping_amount', { precision: 12, scale: 2 })
      .default('0.00')
      .notNull(),
    delivery_price: decimal('delivery_price', { precision: 12, scale: 2 })
      .default('0.00')
      .notNull(),

    // COD (India-specific)
    partial_cod_charges: decimal('partial_cod_charges', { precision: 12, scale: 2 })
      .default('0.00')
      .notNull(),
    advance_paid_amount: decimal('advance_paid_amount', { precision: 12, scale: 2 })
      .default('0.00')
      .notNull(),
    cod_due_amount: decimal('cod_due_amount', { precision: 12, scale: 2 })
      .default('0.00')
      .notNull(),

    // Tax (GST - India) - HIGH PRIORITY FIX #23
    // Phase 3 Batch 3: Added FK constraint for referential integrity
    // COMMENTED OUT - Foreign key to dropped table (31 Jan 2026)
    // tax_rule_id: uuid('tax_rule_id').references(() => taxRules.id, { onDelete: 'set null' }),
    tax_rule_id: uuid('tax_rule_id'), // FK removed - tax_rules table dropped
    tax_amount: decimal('tax_amount', { precision: 12, scale: 2 }).default('0.00').notNull(),
    cgst: decimal('cgst', { precision: 12, scale: 2 }).default('0.00').notNull(),
    sgst: decimal('sgst', { precision: 12, scale: 2 }).default('0.00').notNull(),
    igst: decimal('igst', { precision: 12, scale: 2 }).default('0.00').notNull(),

    // Totals
    total_amount: decimal('total_amount', { precision: 12, scale: 2 }).default('0.00').notNull(),
    total_quantity: integer('total_quantity').default(0).notNull(),

    // Fulfillment
    fulfillment_status: fulfillmentStatusEnum('fulfillment_status')
      .default('unfulfilled')
      .notNull(),
    fulfillment_date: timestamp('fulfillment_date'),
    delivery_date: timestamp('delivery_date'),
    return_date: timestamp('return_date'),
    return_amount: decimal('return_amount', { precision: 12, scale: 2 })
      .default('0.00')
      .notNull(),
    order_tracking: varchar('order_tracking', { length: 200 }),

    // Business
    customer_gstin: varchar('customer_gstin', { length: 20 }),
    is_international_order: boolean('is_international_order').default(false).notNull(),

    // Metadata
    tags: jsonb('tags').default([]),
    customer_note: varchar('customer_note', { length: 500 }),
    admin_comment: varchar('admin_comment', { length: 500 }),
    amz_order_id: varchar('amz_order_id', { length: 100 }),

    // Audit
    created_at: timestamp('created_at').defaultNow().notNull(),
    created_by: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
    updated_by: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
    is_deleted: boolean('is_deleted').default(false).notNull(),
    deleted_at: timestamp('deleted_at'),
    deleted_by: uuid('deleted_by').references(() => users.id, { onDelete: 'set null' }),
  },
  table => ({
    // Performance Indexes
    orderNumberIdx: index('orders_order_number_idx').on(table.order_number),
    userIdIdx: index('orders_user_id_idx').on(table.user_id),
    isDraftIdx: index('orders_is_draft_idx').on(table.is_draft),
    paymentStatusIdx: index('orders_payment_status_idx').on(table.payment_status),
    fulfillmentStatusIdx: index('orders_fulfillment_status_idx').on(table.fulfillment_status),
    createdAtIdx: index('orders_created_at_idx').on(table.created_at),
    draftPaymentIdx: index('orders_draft_payment_idx').on(table.is_draft, table.payment_status),
    razorpayOrderIdIdx: index('orders_razorpay_order_id_idx').on(table.razorpay_order_id),
    // PHASE 1: Critical query optimization indexes
    idx_orders_user_status: index('idx_orders_user_status').on(table.user_id, table.order_status).where(sql`is_deleted = false`),
    idx_orders_status_dates: index('idx_orders_status_dates').on(table.order_status, table.created_at),
  })
);

// Types
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
