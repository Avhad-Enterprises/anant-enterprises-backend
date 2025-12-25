import {
  pgTable,
  bigserial,
  timestamp,
  integer,
  varchar,
  text,
  decimal,
  index,
  boolean,
} from 'drizzle-orm/pg-core';

/**
 * Cart Abandoned Schema
 * Track abandoned carts for recovery campaigns
 */

/**
 * Cart Abandoned Table
 * Snapshot of carts left without checkout
 */
export const cartAbandoned = pgTable(
  'cart_abandoned',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    cart_id: integer('cart_id')
      .notNull()
      .references(() => carts.id, { onDelete: 'cascade' }),
    
    // User info
    user_id: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
    email: varchar('email', { length: 190 }),
    
    // Cart totals at abandonment
    subtotal: decimal('subtotal', { precision: 12, scale: 2 }).notNull(),
    item_count: integer('item_count').notNull(),
    
    // Recovery tracking
    recovery_email_sent: boolean('recovery_email_sent').default(false),
    recovery_email_sent_at: timestamp('recovery_email_sent_at'),
    recovered: boolean('recovered').default(false),
    recovered_order_id: integer('recovered_order_id'),
    
    // Device & session info
    device_type: varchar('device_type', { length: 50 }),
    user_agent: text('user_agent'),
    ip_address: varchar('ip_address', { length: 45 }),
    
    // Timestamps
    abandoned_at: timestamp('abandoned_at').defaultNow().notNull(),
    expires_at: timestamp('expires_at'),
    
    // Audit fields
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    cartIdIdx: index('cart_abandoned_cart_id_idx').on(table.cart_id),
    userIdIdx: index('cart_abandoned_user_id_idx').on(table.user_id),
    emailIdx: index('cart_abandoned_email_idx').on(table.email),
    recoveredIdx: index('cart_abandoned_recovered_idx').on(table.recovered),
    abandonedAtIdx: index('cart_abandoned_abandoned_at_idx').on(table.abandoned_at),
  })
);

// Export types
export type CartAbandoned = typeof cartAbandoned.$inferSelect;
export type NewCartAbandoned = typeof cartAbandoned.$inferInsert;

// Note: Temporary references
const carts = pgTable('carts', {
  id: integer('id').primaryKey(),
});

const users = pgTable('users', {
  id: integer('id').primaryKey(),
});
