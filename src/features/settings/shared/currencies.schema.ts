/**
 * Currencies Schema
 *
 * Multi-currency configuration for international e-commerce.
 * Supports real-time exchange rates OR manual catalog pricing.
 *
 * Simplified: Removed formatting fields (handled by frontend)
 */

import {
    pgTable,
    serial,
    varchar,
    boolean,
    integer,
    timestamp,
    decimal,
    index,
} from 'drizzle-orm/pg-core';
import { users } from '../../user';

// ============================================
// CURRENCIES TABLE
// ============================================

/**
 * Currencies configuration
 * One base currency, multiple supported currencies
 */
export const currencies = pgTable(
    'currencies',
    {
        id: serial('id').primaryKey(),
        code: varchar('code', { length: 3 }).unique().notNull(), // ISO 4217: USD, EUR, INR
        name: varchar('name', { length: 100 }).notNull(), // US Dollar, Euro, Indian Rupee
        symbol: varchar('symbol', { length: 10 }).notNull(), // $, €, ₹

        // Exchange rate configuration
        is_base_currency: boolean('is_base_currency').default(false).notNull(), // Only one true
        use_real_time_rates: boolean('use_real_time_rates').default(true).notNull(),
        exchange_rate: decimal('exchange_rate', { precision: 18, scale: 8 }).default('1.00000000').notNull(), // Rate relative to base
        manual_exchange_rate: decimal('manual_exchange_rate', { precision: 18, scale: 8 }), // Admin override
        rate_last_updated_at: timestamp('rate_last_updated_at'),

        // Status
        is_active: boolean('is_active').default(true).notNull(),

        // Audit
        created_by: integer('created_by')
            .references(() => users.id, { onDelete: 'set null' }),
        updated_by: integer('updated_by')
            .references(() => users.id, { onDelete: 'set null' }),
        created_at: timestamp('created_at').defaultNow().notNull(),
        updated_at: timestamp('updated_at').defaultNow().notNull(),
    },
    (table) => ({
        // Active currencies for dropdowns
        activeIdx: index('currencies_active_idx').on(table.is_active),
        // Base currency lookup
        baseCurrencyIdx: index('currencies_base_idx').on(table.is_base_currency),
        // Code lookup (frequently queried)
        codeIdx: index('currencies_code_idx').on(table.code),
    })
);

// Export types
export type Currency = typeof currencies.$inferSelect;
export type NewCurrency = typeof currencies.$inferInsert;
