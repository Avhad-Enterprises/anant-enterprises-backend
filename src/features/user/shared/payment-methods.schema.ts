/**
 * User Payment Methods Schema
 *
 * Stores tokenized payment method references for Razorpay integration.
 * SECURITY: NEVER stores actual card numbers, CVV, or sensitive data.
 * Only stores tokenized references from payment gateway.
 *
 * Supported Methods:
 * - Cards (Credit/Debit via Razorpay)
 * - UPI
 * - Netbanking
 * - Wallets (Paytm, PhonePe, etc.)
 */

import {
  pgTable,
  varchar,
  boolean,
  integer,
  uuid,
  timestamp,
  index,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './user.schema';
import { userAddresses } from './addresses.schema';

// ============================================
// ENUMS
// ============================================

export const paymentTypeEnum = pgEnum('payment_type', ['card', 'upi', 'netbanking', 'wallet']);
export const cardFundingEnum = pgEnum('card_funding', ['credit', 'debit', 'prepaid']);

// ============================================
// USER PAYMENT METHODS TABLE
// ============================================

/**
 * User payment methods table
 * Stores Razorpay tokens and display metadata only
 * NEVER stores actual card numbers or CVV
 */
export const userPaymentMethods = pgTable(
  'user_payment_methods',
  {
    id: uuid('id').primaryKey().default(sql`uuid_generate_v7()`),
    user_id: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    payment_type: paymentTypeEnum('payment_type').notNull(),
    is_default: boolean('is_default').default(false).notNull(),

    // Razorpay tokens (primary payment gateway)
    razorpay_customer_id: varchar('razorpay_customer_id', { length: 100 }), // cust_xxxxx
    razorpay_token_id: varchar('razorpay_token_id', { length: 100 }), // token_xxxxx

    // Display info (safe to store)
    display_name: varchar('display_name', { length: 100 }), // "Visa •••• 4242"

    // Card metadata (from Razorpay, no sensitive data)
    card_last4: varchar('card_last4', { length: 4 }),
    card_brand: varchar('card_brand', { length: 20 }), // Visa, Mastercard, Amex, RuPay
    card_network: varchar('card_network', { length: 20 }), // Visa, Mastercard, etc.
    card_type: cardFundingEnum('card_type'), // credit, debit, prepaid
    card_issuer: varchar('card_issuer', { length: 100 }), // Bank name
    card_exp_month: integer('card_exp_month'),
    card_exp_year: integer('card_exp_year'),

    // UPI info
    upi_id: varchar('upi_id', { length: 100 }), // name@upi

    // Wallet info
    wallet_type: varchar('wallet_type', { length: 50 }), // Paytm, PhonePe, Freecharge

    // Netbanking info
    netbanking_bank_code: varchar('netbanking_bank_code', { length: 20 }), // Bank code
    netbanking_bank_name: varchar('netbanking_bank_name', { length: 100 }), // Bank name

    // Billing address reference
    billing_address_id: uuid('billing_address_id').references(() => userAddresses.id, {
      onDelete: 'set null',
    }),

    // Verification status
    is_verified: boolean('is_verified').default(false).notNull(),
    verified_at: timestamp('verified_at'),
    last_used_at: timestamp('last_used_at'),

    // Audit fields
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
    is_deleted: boolean('is_deleted').default(false).notNull(),
  },
  table => ({
    // User's payment methods lookup
    userIdIdx: index('user_payment_methods_user_id_idx').on(table.user_id, table.is_deleted),
    // Default payment method lookup
    userDefaultIdx: index('user_payment_methods_user_default_idx').on(
      table.user_id,
      table.is_default,
      table.is_deleted
    ),
    // Razorpay customer lookup
    razorpayCustomerIdx: index('user_payment_methods_razorpay_customer_idx').on(
      table.razorpay_customer_id
    ),
  })
);

// Export types for TypeScript
export type UserPaymentMethod = typeof userPaymentMethods.$inferSelect;
export type NewUserPaymentMethod = typeof userPaymentMethods.$inferInsert;
