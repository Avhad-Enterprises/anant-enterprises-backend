/**
 * Invoice Versions Schema
 *
 * Versioned snapshots of invoice data for audit trail and PDF generation.
 * Each invoice can have multiple versions (edits, corrections, etc.)
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  decimal,
  timestamp,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { invoices } from './invoices.schema';

// ============================================
// ENUMS
// ============================================

export const invoiceVersionReasonEnum = pgEnum('invoice_version_reason', [
  'INITIAL',      // First version of invoice
  'CORRECTION',   // Error correction
  'UPDATE',       // General update
  'CANCELLED',    // Cancellation version
]);

export const invoiceTaxTypeEnum = pgEnum('invoice_tax_type', [
  'cgst_sgst',    // Within state (CGST + SGST)
  'igst',         // Inter-state (IGST only)
  'exempt',       // Tax exempt
]);

// ============================================
// INVOICE VERSIONS TABLE
// ============================================

export const invoiceVersions = pgTable(
  'invoice_versions',
  {
    // Identity
    id: uuid('id').primaryKey().default(sql`uuid_generate_v7()`),

    // Relationships
    invoice_id: uuid('invoice_id')
      .references(() => invoices.id, { onDelete: 'cascade' })
      .notNull(),

    // Version Info
    version_number: integer('version_number').notNull(),
    reason: invoiceVersionReasonEnum('reason').default('INITIAL').notNull(),

    // Customer Details
    customer_name: varchar('customer_name', { length: 255 }).notNull(),
    customer_email: varchar('customer_email', { length: 255 }).notNull(),
    customer_gstin: varchar('customer_gstin', { length: 20 }), // Optional for B2B

    // Addresses
    billing_address: text('billing_address').notNull(),
    shipping_address: text('shipping_address').notNull(),
    place_of_supply: varchar('place_of_supply', { length: 100 }).notNull(),

    // Financials
    subtotal: decimal('subtotal', { precision: 12, scale: 2 }).notNull(),
    discount: decimal('discount', { precision: 12, scale: 2 }).default('0.00').notNull(),
    shipping: decimal('shipping', { precision: 12, scale: 2 }).default('0.00').notNull(),
    tax_amount: decimal('tax_amount', { precision: 12, scale: 2 }).default('0.00').notNull(),
    grand_total: decimal('grand_total', { precision: 12, scale: 2 }).notNull(),

    // GST Breakdown (India-specific)
    cgst: decimal('cgst', { precision: 12, scale: 2 }).default('0.00').notNull(),
    sgst: decimal('sgst', { precision: 12, scale: 2 }).default('0.00').notNull(),
    igst: decimal('igst', { precision: 12, scale: 2 }).default('0.00').notNull(),
    tax_type: invoiceTaxTypeEnum('tax_type').default('cgst_sgst').notNull(),

    // PDF Generation
    pdf_url: text('pdf_url'), // Public URL for PDF
    pdf_path: text('pdf_path'), // Internal file path
    pdf_generated_at: timestamp('pdf_generated_at'),

    // Audit Fields
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  table => ({
    // Indexes
    invoiceIdIdx: index('invoice_versions_invoice_id_idx').on(table.invoice_id),
    versionNumberIdx: index('invoice_versions_version_number_idx').on(table.invoice_id, table.version_number),
  })
);

// Types
export type InvoiceVersion = typeof invoiceVersions.$inferSelect;
export type NewInvoiceVersion = typeof invoiceVersions.$inferInsert;