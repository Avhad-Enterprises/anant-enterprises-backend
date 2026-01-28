/**
 * FAQ Schema
 *
 * Unified table for all FAQs (General, Product-specific, Category-specific).
 */

import {
  pgTable,
  uuid,
  text,
  varchar,
  boolean,
  integer,
  pgEnum,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { products } from '../../product/shared/product.schema';
import { tiers } from '../../tiers/shared/tiers.schema';

// ============================================
// ENUMS
// ============================================

export const faqTargetTypeEnum = pgEnum('faq_target_type', [
  'general',
  'product',
  'tier', // Category
]);

// ============================================
// FAQS TABLE
// ============================================

export const faqs = pgTable(
  'faqs',
  {
    // Identity
    id: uuid('id').primaryKey().default(sql`uuid_generate_v7()`),

    // Content
    question: text('question').notNull(),
    answer: text('answer').notNull(),

    // Targeting Logic
    target_type: faqTargetTypeEnum('target_type').default('general').notNull(),

    // Context Links (Nullable)
    product_id: uuid('product_id').references(() => products.id, { onDelete: 'cascade' }),
    tier_id: uuid('tier_id').references(() => tiers.id, { onDelete: 'cascade' }),

    // Metadata
    section: varchar('section', { length: 100 }), // e.g., "shipping", "returns", "home_hero"
    position: integer('position').default(0).notNull(), // Sorting order
    status: boolean('status').default(true).notNull(), // Active/Inactive

    // Audit Fields
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  table => ({
    // Indexes for fast filtering
    typeIdx: index('faqs_target_type_idx').on(table.target_type),
    productIdx: index('faqs_product_id_idx').on(table.product_id),
    tierIdx: index('faqs_tier_id_idx').on(table.tier_id),
    sectionIdx: index('faqs_section_idx').on(table.section),
  })
);

// Types
export type Faq = typeof faqs.$inferSelect;
export type NewFaq = typeof faqs.$inferInsert;
