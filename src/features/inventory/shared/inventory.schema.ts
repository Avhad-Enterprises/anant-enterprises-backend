/**
 * Inventory Schema
 *
 * Core inventory tracking with product link and condition management.
 * Auto-created when products are created with initial inventory quantity.
 */

import {
  pgTable,
  uuid,
  varchar,
  integer,
  timestamp,
  pgEnum,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { products } from '../../product/shared/product.schema';
import { users } from '../../user/shared/user.schema';
import { inventoryLocations } from './inventory-locations.schema';


// ============================================
// ENUMS
// ============================================

export const inventoryConditionEnum = pgEnum('inventory_condition', [
  'sellable',
  'damaged',
  'quarantined',
  'expired',
]);

export const inventoryStatusEnum = pgEnum('inventory_status', [
  'in_stock',
  'low_stock',
  'out_of_stock',
]);

// ============================================
// INVENTORY TABLE
// ============================================

export const inventory = pgTable(
  'inventory',
  {
    // Identity
    id: uuid('id').primaryKey().default(sql`uuid_generate_v7()`),
    product_id: uuid('product_id')
      .references(() => products.id, { onDelete: 'cascade' })
      .notNull(),

    // Phase 3: Location tracking (replaces text-based location field)
    location_id: uuid('location_id')
      .references(() => inventoryLocations.id)
      .notNull(),


    // Product Reference (denormalized for reporting performance)
    product_name: varchar('product_name', { length: 255 }).notNull(),
    sku: varchar('sku', { length: 100 }).notNull(),

    // Quantity Tracking
    available_quantity: integer('available_quantity').default(0).notNull(),
    reserved_quantity: integer('reserved_quantity').default(0).notNull(), // Committed to orders/carts

    // Incoming Stock (from Purchase Orders)
    incoming_quantity: integer('incoming_quantity').default(0).notNull(),
    incoming_po_reference: varchar('incoming_po_reference', { length: 100 }),
    incoming_eta: timestamp('incoming_eta'),

    // Condition & Status
    condition: inventoryConditionEnum('condition').default('sellable').notNull(),
    status: inventoryStatusEnum('status').default('in_stock').notNull(),

    // REMOVED in Phase 3: location varchar (migrated to location_id FK)

    // Audit Fields
    updated_by: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  table => ({
    // Indexes
    productIdx: index('inventory_product_idx').on(table.product_id),
    skuIdx: index('inventory_sku_idx').on(table.sku),
    statusIdx: index('inventory_status_idx').on(table.status),
    conditionIdx: index('inventory_condition_idx').on(table.condition),

    // Phase 3: Multi-location indexes
    locationIdx: index('inventory_location_id_idx').on(table.location_id),
    productLocationIdx: index('inventory_product_location_idx').on(table.product_id, table.location_id),

    // CHECK CONSTRAINTS
    availableQtyCheck: check('inventory_available_qty_check', sql`available_quantity >= 0`),
    reservedQtyCheck: check('inventory_reserved_qty_check', sql`reserved_quantity >= 0`),
    incomingQtyCheck: check('inventory_incoming_qty_check', sql`incoming_quantity >= 0`),
  })
);

// Types
export type Inventory = typeof inventory.$inferSelect;
export type NewInventory = typeof inventory.$inferInsert;
