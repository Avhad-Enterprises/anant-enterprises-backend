/**
 * Gift Card Transactions Schema
 *
 * Immutable audit log for all gift card balance changes.
 * CRITICAL: Never update gift_cards.current_balance without creating a transaction record.
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  decimal,
  timestamp,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { giftCards } from './gift-cards.schema';
import { users } from '../../user/shared/user.schema';
import { orders } from '../../orders/shared/orders.schema';

// ============================================
// ENUMS
// ============================================

export const giftCardTransactionTypeEnum = pgEnum('gift_card_transaction_type', [
  'issue', // Initial creation/loading
  'redeem', // Used in purchase
  'refund', // Credited back from order refund
  'adjustment', // Manual admin adjustment
  'expiry_reversal', // Reverting expired balance
  'cancellation', // Card cancelled
]);

// ============================================
// GIFT CARD TRANSACTIONS TABLE
// ============================================

export const giftCardTransactions = pgTable(
  'gift_card_transactions',
  {
    // Identity
    id: uuid('id').primaryKey().defaultRandom(),

    // Links
    gift_card_id: uuid('gift_card_id')
      .references(() => giftCards.id, { onDelete: 'cascade' })
      .notNull(),

    // Transaction Details
    type: giftCardTransactionTypeEnum('type').notNull(),
    amount: decimal('amount', { precision: 10, scale: 2 }).notNull(), // Positive or negative

    // Balance Snapshots (for audit integrity)
    balance_before: decimal('balance_before', { precision: 10, scale: 2 }).notNull(),
    balance_after: decimal('balance_after', { precision: 10, scale: 2 }).notNull(),

    // Context
    order_id: uuid('order_id').references(() => orders.id, { onDelete: 'set null' }), // CRITICAL FIX #3C
    refund_id: uuid('refund_id'), // If from order refund

    // Who performed the action
    performed_by_user_id: uuid('performed_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    performed_by_admin_id: uuid('performed_by_admin_id').references(() => users.id, {
      onDelete: 'set null',
    }),

    // Metadata
    notes: text('notes'), // Admin notes or system messages
    ip_address: varchar('ip_address', { length: 45 }), // For fraud detection
    user_agent: text('user_agent'),

    // Idempotency (prevent double-processing)
    idempotency_key: varchar('idempotency_key', { length: 255 }).unique(),

    // Audit
    created_at: timestamp('created_at').defaultNow().notNull(),
  },
  table => ({
    // Indexes
    giftCardIdCreatedIdx: index('gift_card_transactions_card_created_idx').on(
      table.gift_card_id,
      table.created_at
    ),
    orderIdIdx: index('gift_card_transactions_order_id_idx').on(table.order_id),
    idempotencyKeyIdx: index('gift_card_transactions_idempotency_idx').on(table.idempotency_key),
  })
);

// Types
export type GiftCardTransaction = typeof giftCardTransactions.$inferSelect;
export type NewGiftCardTransaction = typeof giftCardTransactions.$inferInsert;
