/**
 * Product Tags Schema
 *
 * Defines the Many-to-Many relationship between Products and Tags.
 */

import {
    pgTable,
    uuid,
    primaryKey,
    index,
} from 'drizzle-orm/pg-core';
import { tags } from './tags.schema';
import { products } from '../../product/shared/product.schema';

// ============================================
// PRODUCT TAGS TABLE
// ============================================

export const productTags = pgTable(
    'product_tags',
    {
        product_id: uuid('product_id')
            .references(() => products.id, { onDelete: 'cascade' })
            .notNull(),

        tag_id: uuid('tag_id')
            .references(() => tags.id, { onDelete: 'cascade' })
            .notNull(),
    },
    table => ({
        // Composite Primary Key
        pk: primaryKey({ columns: [table.product_id, table.tag_id] }),

        // Reverse lookup (Find all products with a tag)
        tagIdIdx: index('product_tags_tag_id_idx').on(table.tag_id),
    })
);

// Types
export type ProductTag = typeof productTags.$inferSelect;
export type NewProductTag = typeof productTags.$inferInsert;
