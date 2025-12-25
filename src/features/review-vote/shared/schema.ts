import {
  pgTable,
  bigserial,
  timestamp,
  integer,
  varchar,
  text,
  index,
  uniqueIndex,
  pgEnum,
} from 'drizzle-orm/pg-core';

/**
 * Review Votes Schema
 * Track helpful/not helpful votes on reviews
 */

// Enums
export const voteTypeEnum = pgEnum('vote_type', ['helpful', 'not_helpful']);

/**
 * Review Votes Table
 * Users can vote reviews as helpful or not
 */
export const reviewVotes = pgTable(
  'review_votes',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    review_id: integer('review_id')
      .notNull()
      .references(() => productReviews.id, { onDelete: 'cascade' }),
    user_id: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      ,
    
    // Vote
    vote_type: voteTypeEnum('vote_type').notNull(),
    
    // Guest tracking (if user_id is null)
    ip_address: varchar('ip_address', { length: 45 }),
    user_agent: text('user_agent'),
    
    // Audit fields
    created_at: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    reviewIdIdx: index('review_votes_review_id_idx').on(table.review_id),
    userIdIdx: index('review_votes_user_id_idx').on(table.user_id),
    voteTypeIdx: index('review_votes_vote_type_idx').on(table.vote_type),
    // Prevent duplicate votes
    reviewUserUniqueIdx: uniqueIndex('review_votes_review_user_unique_idx').on(
      table.review_id,
      table.user_id
    ),
  })
);

// Export types
export type ReviewVote = typeof reviewVotes.$inferSelect;
export type NewReviewVote = typeof reviewVotes.$inferInsert;

// Note: Temporary references
const productReviews = pgTable('product_reviews', {
  id: integer('id').primaryKey(),
});

const users = pgTable('users', {
  id: integer('id').primaryKey(),
});
