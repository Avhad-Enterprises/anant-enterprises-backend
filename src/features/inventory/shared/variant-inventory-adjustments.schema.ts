/**
 * Variant Inventory Adjustments Schema
 *
 * Complete audit trail for product variant inventory changes.
 * Mirrors the structure of inventory_adjustments but for variants.
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { productVariants } from '../../product/shared/product.schema';
import { users } from '../../user/shared/user.schema';
import { adjustmentTypeEnum } from './inventory-adjustments.schema';

// ============================================
// VARIANT INVENTORY ADJUSTMENTS TABLE
// ============================================

export const variantInventoryAdjustments = pgTable(
  'variant_inventory_adjustments',
  {
    // Identity
    id: uuid('id').primaryKey().defaultRandom(),
    variant_id: uuid('variant_id')
      .references(() => productVariants.id, { onDelete: 'cascade' })
      .notNull(),

    // Adjustment Details
    adjustment_type: adjustmentTypeEnum('adjustment_type').notNull(),
    quantity_change: integer('quantity_change').notNull(), // Can be positive or negative

    // Context
    reason: varchar('reason', { length: 500 }).notNull(), // Required explanation
    reference_number: varchar('reference_number', { length: 100 }), // PO, invoice, etc.

    // Snapshots (for audit integrity)
    quantity_before: integer('quantity_before').notNull(),
    quantity_after: integer('quantity_after').notNull(),

    // Who & When
    adjusted_by: uuid('adjusted_by')
      .references(() => users.id, { onDelete: 'set null' })
      .notNull(),
    adjusted_at: timestamp('adjusted_at').defaultNow().notNull(),

    // Additional Notes
    notes: text('notes'),
  },
  table => ({
    // Indexes
    variantAdjustedIdx: index('variant_inventory_adjustments_variant_adjusted_idx').on(
      table.variant_id,
      table.adjusted_at
    ),
    variantAdjustedByIdx: index('variant_inventory_adjustments_adjusted_by_idx').on(table.adjusted_by),
    variantAdjustmentTypeIdx: index('variant_inventory_adjustments_type_idx').on(table.adjustment_type),
  })
);

// Types
export type VariantInventoryAdjustment = typeof variantInventoryAdjustments.$inferSelect;
export type NewVariantInventoryAdjustment = typeof variantInventoryAdjustments.$inferInsert;
