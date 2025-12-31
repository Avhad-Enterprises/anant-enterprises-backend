/**
 * Wishlist Items Schema
 *
 * Defines the items (products) within a wishlist.
 */

import {
    pgTable,
    uuid,
    timestamp,
    primaryKey,
    index,
} from 'drizzle-orm/pg-core';
import { wishlists } from './wishlist.schema';
import { products } from '../../product/shared/product.schema';

// ============================================
// WISHLIST ITEMS TABLE
// ============================================

export const wishlistItems = pgTable(
    'wishlist_items',
    {
        wishlist_id: uuid('wishlist_id')
            .references(() => wishlists.id, { onDelete: 'cascade' })
            .notNull(),

        product_id: uuid('product_id')
            .references(() => products.id, { onDelete: 'cascade' })
            .notNull(),

        added_at: timestamp('added_at').defaultNow().notNull(),
    },
    table => ({
        // Composite Primary Key
        pk: primaryKey({ columns: [table.wishlist_id, table.product_id] }),

        // Reverse lookup (Find who wants this product)
        productIdIdx: index('wishlist_items_product_id_idx').on(table.product_id),
    })
);

// Types
export type WishlistItem = typeof wishlistItems.$inferSelect;
export type NewWishlistItem = typeof wishlistItems.$inferInsert;
