/**
 * Production Orders Schema
 *
 * Manages manufacturing/production orders with scheduling, progress tracking, and completion workflow.
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  decimal,
  date,
  timestamp,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { products } from '../../product/shared/product.schema';
import { inventoryLocations } from './inventory-locations.schema';
import { users } from '../../user/shared/user.schema';

// ============================================
// ENUMS
// ============================================

export const productionStatusEnum = pgEnum('production_status', [
  'pending',
  'in_progress',
  'completed',
  'delayed',
  'cancelled',
]);

export const productionPriorityEnum = pgEnum('production_priority', [
  'low',
  'medium',
  'high',
  'urgent',
]);

// ============================================
// PRODUCTION ORDERS TABLE
// ============================================

export const productionOrders = pgTable(
  'production_orders',
  {
    // Identity
    id: uuid('id').primaryKey().default(sql`uuid_generate_v7()`),
    order_number: varchar('order_number', { length: 50 }).unique().notNull(), // "PO-2024-001"

    // Product & Location
    product_id: uuid('product_id')
      .references(() => products.id, { onDelete: 'cascade' })
      .notNull(),
    location_id: uuid('location_id').references(() => inventoryLocations.id, {
      onDelete: 'set null',
    }),

    // Quantities
    quantity_ordered: integer('quantity_ordered').notNull(),
    quantity_completed: integer('quantity_completed').default(0).notNull(),
    quantity_in_progress: integer('quantity_in_progress').default(0).notNull(),
    quantity_rejected: integer('quantity_rejected').default(0).notNull(),

    // Status & Priority
    status: productionStatusEnum('status').default('pending').notNull(),
    priority: productionPriorityEnum('priority').default('medium').notNull(),

    // Scheduling
    scheduled_start_date: date('scheduled_start_date'),
    scheduled_completion_date: date('scheduled_completion_date'),
    actual_start_date: date('actual_start_date'),
    actual_completion_date: date('actual_completion_date'),

    // Progress Tracking
    completion_percentage: integer('completion_percentage').default(0).notNull(),
    estimated_hours: decimal('estimated_hours', { precision: 10, scale: 2 }),
    actual_hours: decimal('actual_hours', { precision: 10, scale: 2 }),

    // Assignment
    assigned_to: uuid('assigned_to').references(() => users.id, { onDelete: 'set null' }),
    created_by: uuid('created_by')
      .references(() => users.id, { onDelete: 'set null' })
      .notNull(),

    // Notes
    production_notes: text('production_notes'),
    delay_reason: text('delay_reason'),

    // Audit Fields
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  table => ({
    // Indexes
    orderNumberIdx: index('production_orders_order_number_idx').on(table.order_number),
    productStatusIdx: index('production_orders_product_status_idx').on(
      table.product_id,
      table.status
    ),
    statusPriorityIdx: index('production_orders_status_priority_idx').on(
      table.status,
      table.priority
    ),
    scheduledCompletionIdx: index('production_orders_scheduled_completion_idx').on(
      table.scheduled_completion_date
    ),
  })
);

// Types
export type ProductionOrder = typeof productionOrders.$inferSelect;
export type NewProductionOrder = typeof productionOrders.$inferInsert;
