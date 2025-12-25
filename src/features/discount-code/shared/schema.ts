import {
  pgTable,
  serial,
  bigserial,
  timestamp,
  boolean,
  integer,
  varchar,
  decimal,
  index,
  uniqueIndex,
  pgEnum,
} from 'drizzle-orm/pg-core';

/**
 * Discount Codes Schema
 * Individual discount codes and their usage tracking
 */

// Enums
export const discountCodeStatusEnum = pgEnum('discount_code_status', [
  'active',
  'expired',
  'disabled',
  'depleted',
]);

/**
 * Discount Codes Table
 * Individual redeemable codes linked to discount campaigns
 */
export const discountCodes = pgTable(
  'discount_codes',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    discount_id: integer('discount_id')
      .notNull()
      .references(() => discounts.id, { onDelete: 'cascade' }),
    
    // Code
    code: varchar('code', { length: 100 }).notNull().unique(),
    
    // Limits
    usage_limit: integer('usage_limit'),
    usage_count: integer('usage_count').default(0).notNull(),
    per_customer_limit: integer('per_customer_limit').default(1),
    
    // Status
    status: discountCodeStatusEnum('status').default('active').notNull(),
    
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
    discountIdIdx: index('discount_codes_discount_id_idx').on(table.discount_id),
    codeUniqueIdx: uniqueIndex('discount_codes_code_unique_idx').on(table.code),
    statusIdx: index('discount_codes_status_idx').on(table.status),
  })
);

/**
 * Discount Usage Table
 * Tracks which customers used which codes
 */
export const discountUsage = pgTable(
  'discount_usage',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    discount_code_id: integer('discount_code_id')
      .notNull()
      .references(() => discountCodes.id, { onDelete: 'cascade' }),
    user_id: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
    order_id: integer('order_id').references(() => orders.id, { onDelete: 'set null' }),
    
    // Usage info
    discount_amount: decimal('discount_amount', { precision: 12, scale: 2 }).notNull(),
    
    // Audit fields
    created_at: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    discountCodeIdIdx: index('discount_usage_discount_code_id_idx').on(table.discount_code_id),
    userIdIdx: index('discount_usage_user_id_idx').on(table.user_id),
    orderIdIdx: index('discount_usage_order_id_idx').on(table.order_id),
    createdAtIdx: index('discount_usage_created_at_idx').on(table.created_at),
  })
);

/**
 * Discount Products Junction Table
 * Maps discounts to applicable products/collections
 */
export const discountProducts = pgTable(
  'discount_products',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    discount_id: integer('discount_id')
      .notNull()
      .references(() => discounts.id, { onDelete: 'cascade' }),
    
    // Target type
    target_type: varchar('target_type', { length: 60 }).notNull(),
    target_id: integer('target_id').notNull(),
    
    // Audit fields
    created_at: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    discountIdIdx: index('discount_products_discount_id_idx').on(table.discount_id),
    targetTypeIdx: index('discount_products_target_type_idx').on(table.target_type),
    targetIdIdx: index('discount_products_target_id_idx').on(table.target_id),
    discountTargetUniqueIdx: uniqueIndex('discount_products_unique_idx').on(
      table.discount_id,
      table.target_type,
      table.target_id
    ),
  })
);

// Export types
export type DiscountCode = typeof discountCodes.$inferSelect;
export type NewDiscountCode = typeof discountCodes.$inferInsert;
export type DiscountUsage = typeof discountUsage.$inferSelect;
export type NewDiscountUsage = typeof discountUsage.$inferInsert;
export type DiscountProduct = typeof discountProducts.$inferSelect;
export type NewDiscountProduct = typeof discountProducts.$inferInsert;

// Note: Temporary references
const discounts = pgTable('discounts', {
  id: serial('id').primaryKey(),
});

const users = pgTable('users', {
  id: integer('id').primaryKey(),
});

const orders = pgTable('orders', {
  id: integer('id').primaryKey(),
});
