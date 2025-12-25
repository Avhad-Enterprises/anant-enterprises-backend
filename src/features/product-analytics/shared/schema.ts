import {
  pgTable,
  bigserial,
  timestamp,
  integer,
  varchar,
  text,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';

/**
 * Product Views Schema
 * Track product page views for analytics
 */

/**
 * Product Views Table
 * Records each product page view
 */
export const productViews = pgTable(
  'product_views',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    product_id: integer('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    
    // User tracking
    user_id: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
    session_id: varchar('session_id', { length: 100 }),
    
    // Request info
    ip_address: varchar('ip_address', { length: 45 }),
    user_agent: text('user_agent'),
    referrer: varchar('referrer', { length: 500 }),
    
    // Device tracking
    device_type: varchar('device_type', { length: 50 }),
    
    // Timestamp
    viewed_at: timestamp('viewed_at').defaultNow().notNull(),
  },
  (table) => ({
    productIdIdx: index('product_views_product_id_idx').on(table.product_id),
    userIdIdx: index('product_views_user_id_idx').on(table.user_id),
    sessionIdIdx: index('product_views_session_id_idx').on(table.session_id),
    viewedAtIdx: index('product_views_viewed_at_idx').on(table.viewed_at),
  })
);

/**
 * Search Queries Schema
 * Track search queries for analytics and improvement
 */

/**
 * Search Queries Table
 * Records all search queries
 */
export const searchQueries = pgTable(
  'search_queries',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    
    // Query details
    query: varchar('query', { length: 500 }).notNull(),
    results_count: integer('results_count').default(0).notNull(),
    
    // User tracking
    user_id: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
    session_id: varchar('session_id', { length: 100 }),
    
    // Filters applied
    filters: jsonb('filters'),
    
    // Request info
    ip_address: varchar('ip_address', { length: 45 }),
    
    // Click tracking
    clicked_product_id: integer('clicked_product_id'),
    
    // Timestamp
    searched_at: timestamp('searched_at').defaultNow().notNull(),
  },
  (table) => ({
    queryIdx: index('search_queries_query_idx').on(table.query),
    userIdIdx: index('search_queries_user_id_idx').on(table.user_id),
    sessionIdIdx: index('search_queries_session_id_idx').on(table.session_id),
    resultsCountIdx: index('search_queries_results_count_idx').on(table.results_count),
    searchedAtIdx: index('search_queries_searched_at_idx').on(table.searched_at),
  })
);

// Export types
export type ProductView = typeof productViews.$inferSelect;
export type NewProductView = typeof productViews.$inferInsert;
export type SearchQuery = typeof searchQueries.$inferSelect;
export type NewSearchQuery = typeof searchQueries.$inferInsert;

// Note: Temporary references
const products = pgTable('products', {
  id: integer('id').primaryKey(),
});

const users = pgTable('users', {
  id: integer('id').primaryKey(),
});
