/**
 * Gift Card Templates Schema
 *
 * Defines code generation rules and default settings for bulk gift card creation.
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  decimal,
  integer,
  timestamp,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { users } from '../../user/shared/user.schema';

// ============================================
// ENUMS
// ============================================

export const giftCardCharacterSetEnum = pgEnum('gift_card_character_set', [
  'alphanumeric',
  'alphabets',
  'numbers',
]);

// ============================================
// GIFT CARD TEMPLATES TABLE
// ============================================

export const giftCardTemplates = pgTable(
  'gift_card_templates',
  {
    // Identity
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(), // "Holiday 2024", "Standard"
    description: text('description'),

    // Code Generation Rules
    prefix: varchar('prefix', { length: 20 }), // "XMAS-", "GIFT-"
    suffix: varchar('suffix', { length: 20 }), // "-2024"
    code_length: integer('code_length').default(16).notNull(), // Total random chars
    segment_length: integer('segment_length').default(4).notNull(), // Group size (ABCD-1234-EFGH)
    separator: varchar('separator', { length: 1 }).default('-'),

    // Character Set Configuration
    character_set: giftCardCharacterSetEnum('character_set').default('alphanumeric').notNull(),
    include_uppercase: boolean('include_uppercase').default(true).notNull(),
    include_lowercase: boolean('include_lowercase').default(false).notNull(),
    exclude_ambiguous: boolean('exclude_ambiguous').default(true).notNull(), // Exclude O, 0, I, 1, etc.

    // Default Values (for bulk generation)
    default_value: decimal('default_value', { precision: 10, scale: 2 }),
    default_currency: varchar('default_currency', { length: 3 }).default('INR').notNull(),
    default_expiry_days: integer('default_expiry_days'), // 365 = 1 year validity

    // Design (for physical/email cards)
    card_design_url: text('card_design_url'), // Image template
    email_template_id: uuid('email_template_id'), // FK to email_templates (if exists)

    // Status
    is_active: boolean('is_active').default(true).notNull(),

    // Audit Fields
    created_by: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
    is_deleted: boolean('is_deleted').default(false).notNull(),
    deleted_at: timestamp('deleted_at'),
    deleted_by: uuid('deleted_by').references(() => users.id, { onDelete: 'set null' }),
  },
  table => ({
    // Indexes
    nameIdx: index('gift_card_templates_name_idx').on(table.name),
    isActiveIdx: index('gift_card_templates_is_active_idx').on(table.is_active),
  })
);

// Types
export type GiftCardTemplate = typeof giftCardTemplates.$inferSelect;
export type NewGiftCardTemplate = typeof giftCardTemplates.$inferInsert;
