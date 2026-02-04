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
  unique,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { products } from '../../product/shared/products.schema';
import { productVariants } from '../../product/shared/product-variants.schema';
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

    // PHASE 2A: Unified inventory for products AND variants
    // Either product_id OR variant_id must be set (enforced by CHECK constraint)
    product_id: uuid('product_id')
      .references(() => products.id, { onDelete: 'cascade' }),

    variant_id: uuid('variant_id')
      .references(() => productVariants.id, { onDelete: 'cascade' }),

    // Phase 3: Location tracking (replaces text-based location field)
    location_id: uuid('location_id')
      .references(() => inventoryLocations.id, { onDelete: 'restrict' })
      .notNull(),

    // NORMALIZATION FIX: Removed product_name and sku fields
    // These were redundant - always JOIN with products/variants to get current values
    // Benefits: No stale data, reduced storage, single source of truth

    // Quantity Tracking - Two-Bucket Model
    // =========================================
    // PHYSICAL STOCK ALLOCATION:
    // - available_quantity: Total physical stock in warehouse (not yet allocated)
    // - reserved_quantity: Stock temporarily allocated to pending orders/carts
    // 
    // CALCULATION MODEL:
    // - Total Physical Stock = available_quantity + reserved_quantity
    // - Net Sellable Stock = available_quantity - reserved_quantity
    // 
    // IMPORTANT: The subtraction above is NOT double-counting!
    // - When stock is reserved: available_quantity stays same, reserved_quantity increases
    // - Net sellable decreases because stock is now "spoken for"
    // - When order fulfills: BOTH available_quantity AND reserved_quantity decrease
    // - When reservation expires/cancels: reserved_quantity decreases, available_quantity stays same
    // 
    // EXAMPLE FLOW:
    // 1. Initial state: available=100, reserved=0 → Net sellable=100
    // 2. Cart reserves 5: available=100, reserved=5 → Net sellable=95
    // 3. Order places (reserve converted): available=100, reserved=5 → Net sellable=95
    // 4. Order fulfills (ship out): available=95, reserved=0 → Net sellable=95
    // 
    // See: order-reservation.service.ts:validateStockAvailability() for calculation
    available_quantity: integer('available_quantity').default(0).notNull(),
    reserved_quantity: integer('reserved_quantity').default(0).notNull(),

    // Incoming Stock (from Purchase Orders)
    incoming_quantity: integer('incoming_quantity').default(0).notNull(),
    incoming_po_reference: varchar('incoming_po_reference', { length: 100 }),
    incoming_eta: timestamp('incoming_eta'),

    // Condition & Status
    condition: inventoryConditionEnum('condition').default('sellable').notNull(),
    status: inventoryStatusEnum('status').default('in_stock').notNull(),

    // PHASE 1: Analytics & Debugging Fields
    // =========================================
    // These fields provide historical metrics and debugging capabilities without
    // expensive aggregation queries on order_items/cart_items tables

    // Sales metrics (incremented when orders are fulfilled/shipped)
    total_sold: integer('total_sold').default(0).notNull(),
    total_fulfilled: integer('total_fulfilled').default(0).notNull(),

    // Timestamps for inventory movement tracking
    // Updated on: reservations, adjustments, fulfillments, returns
    last_stock_movement_at: timestamp('last_stock_movement_at'),

    // Last sale timestamp (updated when order ships)
    // Useful for identifying slow-moving/stale inventory
    last_sale_at: timestamp('last_sale_at'),

    // REMOVED in Phase 3: location varchar (migrated to location_id FK)

    // Audit Fields
    created_by: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_by: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
    deleted_by: uuid('deleted_by').references(() => users.id, { onDelete: 'set null' }),
    deleted_at: timestamp('deleted_at'),
  },
  table => ({
    // Indexes
    productIdx: index('inventory_product_idx').on(table.product_id),
    variantIdx: index('inventory_variant_idx').on(table.variant_id),
    // Removed: skuIdx (sku column removed - query via products/variants JOIN)
    statusIdx: index('inventory_status_idx').on(table.status),
    conditionIdx: index('inventory_condition_idx').on(table.condition),

    // Multi-location indexes
    locationIdx: index('inventory_location_id_idx').on(table.location_id),
    productLocationIdx: index('inventory_product_location_idx').on(table.product_id, table.location_id),
    variantLocationIdx: index('inventory_variant_location_idx').on(table.variant_id, table.location_id),

    // PHASE 1: Analytics indexes
    // Optimize queries for sales reports and stale inventory identification
    lastSaleIdx: index('inventory_last_sale_idx').on(table.last_sale_at),
    lastMovementIdx: index('inventory_last_movement_idx').on(table.last_stock_movement_at),

    // CHECK CONSTRAINTS
    availableQtyCheck: check('inventory_available_qty_check', sql`available_quantity >= 0`),
    reservedQtyCheck: check('inventory_reserved_qty_check', sql`reserved_quantity >= 0`),
    incomingQtyCheck: check('inventory_incoming_qty_check', sql`incoming_quantity >= 0`),

    // PHASE 1: Analytics field constraints
    totalSoldCheck: check('inventory_total_sold_check', sql`total_sold >= 0`),
    totalFulfilledCheck: check('inventory_total_fulfilled_check', sql`total_fulfilled >= 0`),

    // PHASE 2A: Either product_id OR variant_id must be set (mutually exclusive)
    checkProductOrVariant: check(
      'inventory_product_or_variant_check',
      sql`(product_id IS NOT NULL AND variant_id IS NULL) OR (product_id IS NULL AND variant_id IS NOT NULL)`
    ),

    // PHASE 2A: Unique constraint updated for product+variant+location
    // Prevents duplicate inventory records for same product/variant at same location
    uq_inventory_product_variant_location: unique('uq_inventory_product_variant_location').on(
      table.product_id,
      table.variant_id,
      table.location_id
    ),
  })
);

// Types
export type Inventory = typeof inventory.$inferSelect;
export type NewInventory = typeof inventory.$inferInsert;
