import {
  pgTable,
  bigserial,
  timestamp,
  integer,
  varchar,
  text,
  jsonb,
  index,
  pgEnum,
} from 'drizzle-orm/pg-core';

/**
 * User Activity Log Schema
 * Track user browsing history and interactions (moved from users table JSONB)
 */

// Enums
export const activityTypeEnum = pgEnum('activity_type', [
  'page_view',
  'product_view',
  'search',
  'cart_add',
  'cart_remove',
  'wishlist_add',
  'wishlist_remove',
  'order_placed',
  'review_submitted',
  'other',
]);

/**
 * User Activity Log Table
 * Detailed activity tracking for each user
 */
export const userActivityLog = pgTable(
  'user_activity_log',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    user_id: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    
    // Activity details
    activity_type: activityTypeEnum('activity_type').notNull(),
    
    // Entity reference
    entity_type: varchar('entity_type', { length: 60 }),
    entity_id: integer('entity_id'),
    
    // Additional data
    metadata: jsonb('metadata'),
    
    // Request info
    ip_address: varchar('ip_address', { length: 45 }),
    user_agent: text('user_agent'),
    referrer: varchar('referrer', { length: 500 }),
    
    // Session tracking
    session_id: varchar('session_id', { length: 100 }),
    
    // Timestamp
    created_at: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('user_activity_log_user_id_idx').on(table.user_id),
    activityTypeIdx: index('user_activity_log_activity_type_idx').on(table.activity_type),
    entityTypeIdx: index('user_activity_log_entity_type_idx').on(table.entity_type),
    entityIdIdx: index('user_activity_log_entity_id_idx').on(table.entity_id),
    sessionIdIdx: index('user_activity_log_session_id_idx').on(table.session_id),
    createdAtIdx: index('user_activity_log_created_at_idx').on(table.created_at),
  })
);

// Export types
export type UserActivityLog = typeof userActivityLog.$inferSelect;
export type NewUserActivityLog = typeof userActivityLog.$inferInsert;

// Note: Temporary reference
const users = pgTable('users', {
  id: integer('id').primaryKey(),
});
