/**
 * Product Questions Schema (Q&A)
 *
 * User-generated questions and answers system.
 */

import { pgTable, uuid, text, boolean, timestamp, pgEnum, index } from 'drizzle-orm/pg-core';
import { products } from '../../product/shared/product.schema';
import { users } from '../../user/shared/user.schema';

// ============================================
// ENUMS
// ============================================

export const questionStatusEnum = pgEnum('question_status', ['pending', 'answered', 'rejected']);

// ============================================
// PRODUCT QUESTIONS TABLE
// ============================================

export const productQuestions = pgTable(
  'product_questions',
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
    question: text('question').notNull(),
    answer: text('answer'), // The approved answer

    // Management
    answered_by: uuid('answered_by').references(() => users.id, { onDelete: 'set null' }),
    status: questionStatusEnum('status').default('pending').notNull(),
    is_public: boolean('is_public').default(false).notNull(),

    // Audit Fields
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
    is_deleted: boolean('is_deleted').default(false).notNull(),
  },
  table => ({
    // Optimizing Lookups
    productIdIdx: index('product_questions_product_id_idx').on(table.product_id),
    statusIdx: index('product_questions_status_idx').on(table.status),
  })
);

// Types
export type ProductQuestion = typeof productQuestions.$inferSelect;
export type NewProductQuestion = typeof productQuestions.$inferInsert;
