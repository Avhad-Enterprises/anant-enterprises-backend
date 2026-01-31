/**
 * Wishlist Schema
 *
 * Defines the wishlist container for a user.
 */

import { pgTable, uuid, varchar, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from '../../user/shared/user.schema';

// ============================================
// WISHLISTS TABLE
// ============================================

export const wishlists = pgTable(
  'wishlists',
  {
    // Identity
    id: uuid('id').primaryKey().default(sql`uuid_generate_v7()`),

    // Owner
    user_id: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),

    // Metadata
    access_token: varchar('access_token', { length: 255 }), // For public sharing
    status: boolean('status').default(true).notNull(), // Active/Hidden

    // Audit Fields
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  table => ({
    // Fast lookup by user
    userIdIdx: index('wishlists_user_id_idx').on(table.user_id),
    tokenIdx: index('wishlists_access_token_idx').on(table.access_token),
  })
);

// Types
export type Wishlist = typeof wishlists.$inferSelect;
export type NewWishlist = typeof wishlists.$inferInsert;
