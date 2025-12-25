import {
  pgTable,
  bigserial,
  timestamp,
  boolean,
  integer,
  varchar,
  text,
  decimal,
  index,
  pgEnum,
} from 'drizzle-orm/pg-core';

/**
 * Inventory Transactions Schema
 * Tracks all stock movements (purchases, sales, adjustments, transfers)
 */

// Enums
export const transactionTypeEnum = pgEnum('transaction_type', [
  'purchase',
  'sale',
  'return',
  'adjustment',
  'transfer_out',
  'transfer_in',
  'damaged',
  'recount',
]);

export const transactionStatusEnum = pgEnum('transaction_status', [
  'pending',
  'completed',
  'cancelled',
]);

/**
 * Inventory Transactions Table
 * Audit trail of all inventory changes
 */
export const inventoryTransactions = pgTable(
  'inventory_transactions',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    
    // Reference
    transaction_number: varchar('transaction_number', { length: 50 }).notNull().unique(),
    type: transactionTypeEnum('type').notNull(),
    status: transactionStatusEnum('status').default('pending').notNull(),
    
    // Product & Location
    variant_id: integer('variant_id')
      .notNull()
      .references(() => productVariants.id, { onDelete: 'cascade' }),
    location_id: integer('location_id')
      .notNull()
      .references(() => inventoryLocations.id, { onDelete: 'cascade' }),
    
    // Quantities
    quantity: integer('quantity').notNull(),
    quantity_before: integer('quantity_before').notNull(),
    quantity_after: integer('quantity_after').notNull(),
    
    // Cost tracking
    unit_cost: decimal('unit_cost', { precision: 12, scale: 2 }),
    total_cost: decimal('total_cost', { precision: 12, scale: 2 }),
    
    // References
    order_id: integer('order_id'),
    transfer_id: integer('transfer_id'),
    reference_number: varchar('reference_number', { length: 100 }),
    
    // Details
    reason: varchar('reason', { length: 255 }),
    notes: text('notes'),
    
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
    variantIdIdx: index('inventory_transactions_variant_id_idx').on(table.variant_id),
    locationIdIdx: index('inventory_transactions_location_id_idx').on(table.location_id),
    typeIdx: index('inventory_transactions_type_idx').on(table.type),
    statusIdx: index('inventory_transactions_status_idx').on(table.status),
    orderIdIdx: index('inventory_transactions_order_id_idx').on(table.order_id),
    transferIdIdx: index('inventory_transactions_transfer_id_idx').on(table.transfer_id),
    createdAtIdx: index('inventory_transactions_created_at_idx').on(table.created_at),
  })
);

// Export types
export type InventoryTransaction = typeof inventoryTransactions.$inferSelect;
export type NewInventoryTransaction = typeof inventoryTransactions.$inferInsert;

// Note: Temporary references
const productVariants = pgTable('product_variants', {
  id: integer('id').primaryKey(),
});

const inventoryLocations = pgTable('inventory_locations', {
  id: integer('id').primaryKey(),
});
