/**
 * Product FAQs Schema
 *
 * Defines specific Q&A attached to products.
 */

import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';
import { products } from './product.schema';

// ============================================
// PRODUCT FAQS TABLE
// ============================================

export const productFaqs = pgTable(
  'product_faqs',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Parent Link
    product_id: uuid('product_id')
      .references(() => products.id, { onDelete: 'cascade' })
      .notNull(),

    // Content
    question: text('question').notNull(),
    answer: text('answer').notNull(),

    // Audit Fields
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  table => ({
    // Lookup FAQs by product
    productIdIdx: index('product_faqs_product_id_idx').on(table.product_id),
  })
);

// Types
export type ProductFaq = typeof productFaqs.$inferSelect;
export type NewProductFaq = typeof productFaqs.$inferInsert;
