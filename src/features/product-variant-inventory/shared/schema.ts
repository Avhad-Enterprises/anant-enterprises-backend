import {
  pgTable,
  bigserial,
  timestamp,
  boolean,
  integer,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

/**
 * Product Variant Inventory Schema
 * Tracks stock levels per variant per warehouse location
 */

/**
 * Product Variant Inventory Table
 * Stock tracking for each variant at each location
 */
export const productVariantInventory = pgTable(
  'product_variant_inventory',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    variant_id: integer('variant_id')
      .notNull()
      .references(() => productVariants.id, { onDelete: 'cascade' }),
    location_id: integer('location_id')
      .notNull()
      .references(() => inventoryLocations.id, { onDelete: 'cascade' }),
    
    // Stock levels
    available: integer('available').default(0).notNull(),
    reserved: integer('reserved').default(0).notNull(),
    incoming: integer('incoming').default(0).notNull(),
    damaged: integer('damaged').default(0).notNull(),
    
    // Reorder settings
    reorder_level: integer('reorder_level').default(0),
    reorder_quantity: integer('reorder_quantity').default(0),
    
    // Tracking
    is_tracked: boolean('is_tracked').default(true).notNull(),
    low_stock_alert: boolean('low_stock_alert').default(false).notNull(),
    last_counted_at: timestamp('last_counted_at'),
    
    // Audit fields
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    variantIdIdx: index('product_variant_inventory_variant_id_idx').on(table.variant_id),
    locationIdIdx: index('product_variant_inventory_location_id_idx').on(table.location_id),
    variantLocationUniqueIdx: uniqueIndex('product_variant_inventory_unique_idx').on(
      table.variant_id,
      table.location_id
    ),
    availableIdx: index('product_variant_inventory_available_idx').on(table.available),
    lowStockAlertIdx: index('product_variant_inventory_low_stock_alert_idx').on(table.low_stock_alert),
  })
);

// Export types
export type ProductVariantInventory = typeof productVariantInventory.$inferSelect;
export type NewProductVariantInventory = typeof productVariantInventory.$inferInsert;

// Note: Temporary references - will be properly linked when tables are created
const productVariants = pgTable('product_variants', {
  id: integer('id').primaryKey(),
});

const inventoryLocations = pgTable('inventory_locations', {
  id: integer('id').primaryKey(),
});
