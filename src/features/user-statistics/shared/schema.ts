import {
  pgTable,
  serial,
  timestamp,
  integer,
  decimal,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

/**
 * User Statistics Schema
 * Pre-computed metrics and aggregated statistics for users
 * Updated by background jobs for performance optimization
 */

/**
 * User Statistics Table
 * Cached computed values to avoid expensive real-time calculations
 */
export const userStatistics = pgTable(
  'user_statistics',
  {
    id: serial('id').primaryKey(),
    user_id: integer('user_id')
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Order statistics
    total_orders: integer('total_orders').default(0).notNull(),
    total_spent: decimal('total_spent', { precision: 12, scale: 2 }).default('0.00').notNull(),
    average_order_value: decimal('average_order_value', { precision: 12, scale: 2 }),
    last_order_placed_at: timestamp('last_order_placed_at'),
    first_order_at: timestamp('first_order_at'),

    // Review and support statistics
    total_reviews: integer('total_reviews').default(0).notNull(),
    average_rating: decimal('average_rating', { precision: 3, scale: 2 }),
    support_tickets_created: integer('support_tickets_created').default(0).notNull(),
    support_tickets_resolved: integer('support_tickets_resolved').default(0).notNull(),

    // Wishlist and cart statistics
    wishlist_items_count: integer('wishlist_items_count').default(0).notNull(),
    cart_abandonment_count: integer('cart_abandonment_count').default(0).notNull(),

    // Return and dispute statistics
    total_returns: integer('total_returns').default(0).notNull(),
    total_disputes: integer('total_disputes').default(0).notNull(),

    // Activity statistics
    total_page_views: integer('total_page_views').default(0).notNull(),
    total_product_views: integer('total_product_views').default(0).notNull(),
    total_search_queries: integer('total_search_queries').default(0).notNull(),

    // Computed time-based metrics
    days_since_last_order: integer('days_since_last_order'),
    days_since_registration: integer('days_since_registration'),

    // Metadata
    last_updated_at: timestamp('last_updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: uniqueIndex('user_statistics_user_id_idx').on(table.user_id),
    totalSpentIdx: index('user_statistics_total_spent_idx').on(table.total_spent),
    totalOrdersIdx: index('user_statistics_total_orders_idx').on(table.total_orders),
    lastOrderIdx: index('user_statistics_last_order_idx').on(table.last_order_placed_at),
    lastUpdatedIdx: index('user_statistics_last_updated_idx').on(table.last_updated_at),
  })
);

// Export types
export type UserStatistic = typeof userStatistics.$inferSelect;
export type NewUserStatistic = typeof userStatistics.$inferInsert;

// Temporary reference
const users = pgTable('users', {
  id: integer('id').primaryKey(),
});
