/**
 * Customer Statistics Schema
 *
 * Pre-computed customer metrics for dashboards and analytics.
 * Updated asynchronously via events/cron - not real-time.
 *
 * Purpose:
 * - Avoid expensive aggregation queries
 * - Power customer dashboards
 * - Support customer segmentation
 */

import { pgTable, serial, integer, uuid, timestamp, decimal, index } from 'drizzle-orm/pg-core';
import { users } from './user.schema';

// ============================================
// CUSTOMER STATISTICS TABLE
// ============================================

/**
 * Customer statistics for analytics
 * One-to-one with users table
 * Updated async - eventual consistency
 */
export const customerStatistics = pgTable(
  'customer_statistics',
  {
    id: serial('id').primaryKey(),
    user_id: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .unique()
      .notNull(),

    // Order counts
    total_orders: integer('total_orders').default(0).notNull(),
    completed_orders: integer('completed_orders').default(0).notNull(),
    cancelled_orders: integer('cancelled_orders').default(0).notNull(),
    returned_orders: integer('returned_orders').default(0).notNull(),

    // Spending
    total_spent: decimal('total_spent', { precision: 15, scale: 2 }).default('0.00').notNull(),
    average_order_value: decimal('average_order_value', { precision: 12, scale: 2 })
      .default('0.00')
      .notNull(),
    highest_order_value: decimal('highest_order_value', { precision: 12, scale: 2 }),

    // Timing
    first_order_at: timestamp('first_order_at'),
    last_order_at: timestamp('last_order_at'),
    days_since_last_order: integer('days_since_last_order'),

    // Preferences (IDs link to product catalog - will be added later)
    favorite_category_id: integer('favorite_category_id'),
    favorite_brand_id: integer('favorite_brand_id'),

    // Engagement
    cart_abandonment_count: integer('cart_abandonment_count').default(0).notNull(),
    wishlist_items_count: integer('wishlist_items_count').default(0).notNull(),
    support_tickets_count: integer('support_tickets_count').default(0).notNull(),

    // Reviews
    reviews_count: integer('reviews_count').default(0).notNull(),
    average_review_rating: decimal('average_review_rating', { precision: 3, scale: 2 }),

    // Last updated (for caching/refresh)
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  table => ({
    // For async updates
    updatedAtIdx: index('customer_stats_updated_at_idx').on(table.updated_at),
    // For analytics queries
    totalSpentIdx: index('customer_stats_total_spent_idx').on(table.total_spent),
    totalOrdersIdx: index('customer_stats_total_orders_idx').on(table.total_orders),
  })
);

// Export types for TypeScript
export type CustomerStatistics = typeof customerStatistics.$inferSelect;
export type NewCustomerStatistics = typeof customerStatistics.$inferInsert;
