/**
 * Discount Codes Schema
 *
 * Manages the specific codes that trigger a discount.
 * Separation allows multiple codes for the same discount campaign (e.g. Influencer Codes).
 */

import { pgTable, uuid, varchar, integer, jsonb, index } from 'drizzle-orm/pg-core';
import { discounts } from './discount.schema';

// ============================================
// DISCOUNT CODES TABLE
// ============================================

export const discountCodes = pgTable(
  'discount_codes',
  {
    code: varchar('code', { length: 50 }).primaryKey(), // Using Code as PK (must be unique globally)

    // Parent Campaign
    discount_id: uuid('discount_id')
      .references(() => discounts.id, { onDelete: 'cascade' })
      .notNull(),

    // Usage Tracking (CRITICAL FIX #8)
    usage_limit: integer('usage_limit'), // Limit for THIS specific code
    usage_count: integer('usage_count').default(0).notNull(),
    max_uses_per_customer: integer('max_uses_per_customer'), // e.g., max 3 uses per customer
    // Note: Track individual uses via orders.discount_code_id FK

    // HIGH PRIORITY FIX #20: User restrictions
    allowed_user_ids: jsonb('allowed_user_ids').default([]), // Specific users only
    allowed_email_domains: jsonb('allowed_email_domains').default([]), // e.g., ["@company.com"]
    required_customer_tags: jsonb('required_customer_tags').default([]), // Must have these tags
  },
  table => ({
    // Lookup via discount_id
    discountIdIdx: index('discount_codes_discount_id_idx').on(table.discount_id),
  })
);

// Types
export type DiscountCode = typeof discountCodes.$inferSelect;
export type NewDiscountCode = typeof discountCodes.$inferInsert;
