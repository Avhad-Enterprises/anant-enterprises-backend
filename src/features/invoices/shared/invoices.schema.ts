/**
 * Invoices Schema
 *
 * Core invoice management system for order billing.
 * Supports versioning, PDF generation, and GST compliance.
 */

import {
  pgTable,
  uuid,
  varchar,
  integer,
  timestamp,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { orders } from '../../orders/shared/orders.schema';

// ============================================
// ENUMS
// ============================================

export const invoiceStatusEnum = pgEnum('invoice_status', [
  'draft',      // Invoice created but not finalized
  'generated',  // Invoice PDF generated
  'sent',       // Invoice sent to customer
  'paid',       // Invoice fully paid
  'overdue',    // Payment past due date
  'cancelled',  // Invoice cancelled
]);

// ============================================
// INVOICES TABLE
// ============================================

export const invoices = pgTable(
  'invoices',
  {
    // Identity
    id: uuid('id').primaryKey().default(sql`uuid_generate_v7()`),

    // Relationships
    order_id: uuid('order_id')
      .references(() => orders.id, { onDelete: 'cascade' })
      .notNull(),

    // Invoice Details
    invoice_number: varchar('invoice_number', { length: 50 }).notNull().unique(),
    latest_version: integer('latest_version').default(1).notNull(),

    // Status
    status: invoiceStatusEnum('status').default('draft').notNull(),

    // Audit Fields
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  table => ({
    // Indexes
    orderIdIdx: index('invoices_order_id_idx').on(table.order_id),
    statusIdx: index('invoices_status_idx').on(table.status),
    invoiceNumberIdx: index('invoices_invoice_number_idx').on(table.invoice_number),
  })
);

// Types
export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;