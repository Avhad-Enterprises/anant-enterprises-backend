/**
 * Invoice Line Items Schema
 *
 * Individual line items within an invoice version.
 * Contains product details, pricing, and tax calculations.
 */

import {
  pgTable,
  uuid,
  varchar,
  integer,
  decimal,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { invoiceVersions } from './invoice-versions.schema';

// ============================================
// INVOICE LINE ITEMS TABLE
// ============================================

export const invoiceLineItems = pgTable(
  'invoice_line_items',
  {
    // Identity
    id: uuid('id').primaryKey().default(sql`uuid_generate_v7()`),

    // Relationships
    invoice_version_id: uuid('invoice_version_id')
      .references(() => invoiceVersions.id, { onDelete: 'cascade' })
      .notNull(),

    // Product Details
    product_name: varchar('product_name', { length: 255 }).notNull(),
    sku: varchar('sku', { length: 100 }).notNull(),
    hsn_code: varchar('hsn_code', { length: 20 }), // HSN/SAC code for GST

    // Quantity & Pricing
    quantity: integer('quantity').notNull(),
    unit_price: decimal('unit_price', { precision: 12, scale: 2 }).notNull(),

    // Tax Calculations
    tax_rate: decimal('tax_rate', { precision: 5, scale: 2 }).default('0.00').notNull(),
    cgst_amount: decimal('cgst_amount', { precision: 12, scale: 2 }).default('0.00').notNull(),
    sgst_amount: decimal('sgst_amount', { precision: 12, scale: 2 }).default('0.00').notNull(),
    igst_amount: decimal('igst_amount', { precision: 12, scale: 2 }).default('0.00').notNull(),

    // Line Total
    line_total: decimal('line_total', { precision: 12, scale: 2 }).notNull(),

    // Audit Fields
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  table => ({
    // Indexes
    invoiceVersionIdIdx: index('invoice_line_items_invoice_version_id_idx').on(table.invoice_version_id),
    skuIdx: index('invoice_line_items_sku_idx').on(table.sku),
  })
);

// Types
export type InvoiceLineItem = typeof invoiceLineItems.$inferSelect;
export type NewInvoiceLineItem = typeof invoiceLineItems.$inferInsert;