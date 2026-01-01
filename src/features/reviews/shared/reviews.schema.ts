/**
 * Reviews Schema
 *
 * Support for product ratings and reviews with moderation status.
 */

import {
    pgTable,
    uuid,
    varchar,
    text,
    boolean,
    integer,
    timestamp,
    pgEnum,
    jsonb,
    index,
} from 'drizzle-orm/pg-core';
import { products } from '../../product/shared/product.schema';
import { users } from '../../user/shared/user.schema';

// ============================================
// ENUMS
// ============================================

export const reviewStatusEnum = pgEnum('review_status', [
    'pending',
    'approved',
    'rejected'
]);

// ============================================
// REVIEWS TABLE
// ============================================

export const reviews = pgTable(
    'reviews',
    {
        // Identity
        id: uuid('id').primaryKey().defaultRandom(),

        // Links
        product_id: uuid('product_id')
            .references(() => products.id, { onDelete: 'cascade' })
            .notNull(),
        user_id: uuid('user_id')
            .references(() => users.id, { onDelete: 'cascade' })
            .notNull(),

        // Content
        rating: integer('rating').notNull(), // 1-5
        title: varchar('title', { length: 255 }),
        comment: text('comment'),
        media_urls: jsonb('media_urls').default([]), // Array of image/video URLs

        // Status & Metadata
        is_verified_purchase: boolean('is_verified_purchase').default(false).notNull(),
        status: reviewStatusEnum('status').default('pending').notNull(),
        admin_reply: text('admin_reply'),
        helpful_votes: integer('helpful_votes').default(0).notNull(),

        // Audit Fields
        created_at: timestamp('created_at').defaultNow().notNull(),
        updated_at: timestamp('updated_at').defaultNow().notNull(),
        is_deleted: boolean('is_deleted').default(false).notNull(),
    },
    table => ({
        // Optimizing Lookups
        productIdIdx: index('reviews_product_id_idx').on(table.product_id),
        userIdIdx: index('reviews_user_id_idx').on(table.user_id),
        statusIdx: index('reviews_status_idx').on(table.status),
        ratingIdx: index('reviews_rating_idx').on(table.rating),
    })
);

// Types
export type Review = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;
