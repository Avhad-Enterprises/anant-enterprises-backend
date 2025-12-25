import {
  pgTable,
  serial,
  bigserial,
  timestamp,
  boolean,
  integer,
  varchar,
  text,
  decimal,
  jsonb,
  index,
  pgEnum,
} from 'drizzle-orm/pg-core';

/**
 * Price Rules Schema
 * Dynamic pricing based on quantity, customer segments, products
 */

// Enums
export const priceRuleTypeEnum = pgEnum('price_rule_type', [
  'percentage',
  'fixed_amount',
  'fixed_price',
  'tiered',
]);

export const priceRuleAppliestoEnum = pgEnum('price_rule_applies_to', [
  'all_products',
  'specific_products',
  'specific_categories',
  'specific_collections',
]);

export const priceRuleStatusEnum = pgEnum('price_rule_status', [
  'draft',
  'active',
  'scheduled',
  'expired',
  'paused',
]);

/**
 * Price Rules Table
 * Define dynamic pricing rules for segments, quantities, etc.
 */
export const priceRules = pgTable(
  'price_rules',
  {
    id: serial('id').primaryKey(),
    
    // Basic info
    name: varchar('name', { length: 180 }).notNull(),
    description: text('description'),
    type: priceRuleTypeEnum('type').notNull(),
    priority: integer('priority').default(0),
    
    // Discount value
    value: decimal('value', { precision: 12, scale: 2 }).notNull(),
    
    // Application scope
    applies_to: priceRuleAppliestoEnum('applies_to').notNull(),
    
    // Target products/categories (JSONB arrays)
    target_products: jsonb('target_products'),
    target_categories: jsonb('target_categories'),
    target_collections: jsonb('target_collections'),
    
    // Customer segments
    customer_segments: jsonb('customer_segments'),
    
    // Scheduling
    starts_at: timestamp('starts_at').notNull(),
    ends_at: timestamp('ends_at'),
    status: priceRuleStatusEnum('status').default('draft').notNull(),
    
    // Limits
    usage_limit: integer('usage_limit'),
    usage_count: integer('usage_count').default(0).notNull(),
    per_customer_limit: integer('per_customer_limit'),
    
    // Audit fields
    created_by: integer('created_by'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_by: integer('updated_by'),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
    is_deleted: boolean('is_deleted').default(false).notNull(),
    deleted_by: integer('deleted_by'),
    deleted_at: timestamp('deleted_at'),
  },
  (table) => ({
    statusIdx: index('price_rules_status_idx').on(table.status),
    priorityIdx: index('price_rules_priority_idx').on(table.priority),
    startsAtIdx: index('price_rules_starts_at_idx').on(table.starts_at),
    endsAtIdx: index('price_rules_ends_at_idx').on(table.ends_at),
  })
);

/**
 * Price Rule Conditions Table
 * Conditions that must be met for price rule to apply
 */
export const priceRuleConditions = pgTable(
  'price_rule_conditions',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    price_rule_id: integer('price_rule_id')
      .notNull()
      .references(() => priceRules.id, { onDelete: 'cascade' }),
    
    // Condition type
    condition_type: varchar('condition_type', { length: 60 }).notNull(),
    condition_operator: varchar('condition_operator', { length: 20 }).notNull(),
    condition_value: varchar('condition_value', { length: 255 }).notNull(),
    
    // Audit fields
    created_at: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    priceRuleIdIdx: index('price_rule_conditions_price_rule_id_idx').on(table.price_rule_id),
    conditionTypeIdx: index('price_rule_conditions_condition_type_idx').on(table.condition_type),
  })
);

// Export types
export type PriceRule = typeof priceRules.$inferSelect;
export type NewPriceRule = typeof priceRules.$inferInsert;
export type PriceRuleCondition = typeof priceRuleConditions.$inferSelect;
export type NewPriceRuleCondition = typeof priceRuleConditions.$inferInsert;
