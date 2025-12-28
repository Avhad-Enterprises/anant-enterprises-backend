import {
  pgTable,
  serial,
  timestamp,
  boolean,
  integer,
  varchar,
  jsonb,
  index,
  uniqueIndex,
  pgEnum,
} from 'drizzle-orm/pg-core';

/**
 * User Payment Methods Schema
 * Stored payment methods for users (tokenized for security)
 */

// Enums
export const paymentMethodTypeEnum = pgEnum('payment_method_type', [
  'card',
  'upi',
  'netbanking',
  'wallet',
  'bank_transfer',
]);

export const paymentMethodStatusEnum = pgEnum('payment_method_status', [
  'active',
  'inactive',
  'expired',
  'failed',
]);

/**
 * User Payment Methods Table
 * Tokenized payment methods for quick checkout
 */
export const userPaymentMethods = pgTable(
  'user_payment_methods',
  {
    id: serial('id').primaryKey(),
    user_id: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Payment method details
    type: paymentMethodTypeEnum('type').notNull(),
    status: paymentMethodStatusEnum('status').default('active').notNull(),

    // Card details (for card payments)
    card_last4: varchar('card_last4', { length: 4 }),
    card_brand: varchar('card_brand', { length: 50 }),
    card_exp_month: integer('card_exp_month'),
    card_exp_year: integer('card_exp_year'),
    card_fingerprint: varchar('card_fingerprint', { length: 255 }),

    // UPI details
    upi_id: varchar('upi_id', { length: 100 }),

    // Net banking details
    bank_name: varchar('bank_name', { length: 100 }),
    bank_code: varchar('bank_code', { length: 20 }),

    // Wallet details
    wallet_provider: varchar('wallet_provider', { length: 50 }),
    wallet_mobile: varchar('wallet_mobile', { length: 30 }),

    // Bank transfer details
    account_holder_name: varchar('account_holder_name', { length: 150 }),
    account_number_last4: varchar('account_number_last4', { length: 4 }),
    ifsc_code: varchar('ifsc_code', { length: 20 }),

    // Gateway information (tokenized)
    gateway_customer_id: varchar('gateway_customer_id', { length: 255 }),
    gateway_payment_method_id: varchar('gateway_payment_method_id', { length: 255 }),

    // Metadata and preferences
    metadata: jsonb('metadata').default('{}').notNull(),
    is_default: boolean('is_default').default(false).notNull(),
    nickname: varchar('nickname', { length: 50 }),

    // Usage tracking
    last_used_at: timestamp('last_used_at'),
    usage_count: integer('usage_count').default(0).notNull(),
    failed_attempts: integer('failed_attempts').default(0).notNull(),

    // Audit fields
    created_by: integer('created_by').references(() => users.id),
    updated_by: integer('updated_by').references(() => users.id),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
    is_deleted: boolean('is_deleted').default(false).notNull(),
    deleted_at: timestamp('deleted_at'),
    deleted_by: integer('deleted_by').references(() => users.id),
  },
  (table) => ({
    userIdIdx: index('user_payment_methods_user_id_idx').on(table.user_id),
    typeIdx: index('user_payment_methods_type_idx').on(table.type),
    statusIdx: index('user_payment_methods_status_idx').on(table.status),
    isDefaultIdx: index('user_payment_methods_is_default_idx').on(table.user_id, table.is_default),
    lastUsedIdx: index('user_payment_methods_last_used_idx').on(table.last_used_at),
    gatewayPaymentMethodIdx: uniqueIndex('user_payment_methods_gateway_pm_idx').on(table.gateway_payment_method_id),
    createdAtIdx: index('user_payment_methods_created_at_idx').on(table.created_at),
  })
);

// Export types
export type UserPaymentMethod = typeof userPaymentMethods.$inferSelect;
export type NewUserPaymentMethod = typeof userPaymentMethods.$inferInsert;

// Temporary reference
const users = pgTable('users', {
  id: integer('id').primaryKey(),
});
