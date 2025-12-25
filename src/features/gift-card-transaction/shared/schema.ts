import {
  pgTable,
  bigserial,
  timestamp,
  integer,
  text,
  decimal,
  index,
  pgEnum,
} from 'drizzle-orm/pg-core';

/**
 * Gift Card Transactions Schema
 * Tracks all gift card usage and balance changes
 */

// Enums
export const giftCardTransactionTypeEnum = pgEnum('gift_card_transaction_type', [
  'issued',
  'redeemed',
  'refunded',
  'expired',
  'adjusted',
]);

/**
 * Gift Card Transactions Table
 * Complete history of gift card balance changes
 */
export const giftCardTransactions = pgTable(
  'gift_card_transactions',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    gift_card_id: integer('gift_card_id')
      .notNull()
      .references(() => giftCards.id, { onDelete: 'cascade' }),
    
    // Transaction details
    type: giftCardTransactionTypeEnum('type').notNull(),
    amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
    balance_before: decimal('balance_before', { precision: 12, scale: 2 }).notNull(),
    balance_after: decimal('balance_after', { precision: 12, scale: 2 }).notNull(),
    
    // References
    order_id: integer('order_id').references(() => orders.id, { onDelete: 'set null' }),
    user_id: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
    
    // Details
    description: text('description'),
    notes: text('notes'),
    
    // Audit fields
    created_by: integer('created_by'),
    created_at: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    giftCardIdIdx: index('gift_card_transactions_gift_card_id_idx').on(table.gift_card_id),
    typeIdx: index('gift_card_transactions_type_idx').on(table.type),
    orderIdIdx: index('gift_card_transactions_order_id_idx').on(table.order_id),
    userIdIdx: index('gift_card_transactions_user_id_idx').on(table.user_id),
    createdAtIdx: index('gift_card_transactions_created_at_idx').on(table.created_at),
  })
);

// Export types
export type GiftCardTransaction = typeof giftCardTransactions.$inferSelect;
export type NewGiftCardTransaction = typeof giftCardTransactions.$inferInsert;

// Note: Temporary references
const giftCards = pgTable('gift_cards', {
  id: integer('id').primaryKey(),
});

const orders = pgTable('orders', {
  id: integer('id').primaryKey(),
});

const users = pgTable('users', {
  id: integer('id').primaryKey(),
});
