import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  decimal,
  index,
  varchar,
} from 'drizzle-orm/pg-core';
import { orders } from '../../orders/shared';

/**
 * Invoice status enum values
 */
export const invoiceStatuses = ['draft', 'generated', 'sent', 'cancelled'] as const;
export type InvoiceStatus = (typeof invoiceStatuses)[number];

/**
 * Invoice reason enum values
 */
export const invoiceReasons = ['INITIAL', 'CORRECTION', 'REFUND'] as const;
export type InvoiceReason = (typeof invoiceReasons)[number];

/**
 * Invoices table schema
 * Stores invoice metadata and links to order
 */
export const invoices = pgTable(
  'invoices',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    order_id: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    invoice_number: varchar('invoice_number', { length: 50 }).notNull().unique(),
    latest_version: integer('latest_version').default(1).notNull(),
    status: text('status').$type<InvoiceStatus>().default('draft').notNull(),
    // Audit fields
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  table => ({
    orderIdIdx: index('invoices_order_id_idx').on(table.order_id),
    invoiceNumberIdx: index('invoices_invoice_number_idx').on(table.invoice_number),
    statusIdx: index('invoices_status_idx').on(table.status),
  })
);

/**
 * Invoice versions table schema
 * Stores immutable snapshots of invoice data
 */
export const invoiceVersions = pgTable(
  'invoice_versions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    invoice_id: uuid('invoice_id')
      .notNull()
      .references(() => invoices.id, { onDelete: 'cascade' }),
    version_number: integer('version_number').notNull(),
    customer_name: varchar('customer_name', { length: 255 }).notNull(),
    customer_email: varchar('customer_email', { length: 255 }).notNull(),
    customer_gstin: varchar('customer_gstin', { length: 20 }),
    billing_address: text('billing_address').notNull(),
    shipping_address: text('shipping_address').notNull(),
    place_of_supply: varchar('place_of_supply', { length: 255 }).notNull(),
    // Totals
    subtotal: decimal('subtotal', { precision: 10, scale: 2 }).notNull(),
    discount: decimal('discount', { precision: 10, scale: 2 }).default('0').notNull(),
    shipping: decimal('shipping', { precision: 10, scale: 2 }).default('0').notNull(),
    tax_amount: decimal('tax_amount', { precision: 10, scale: 2 }).default('0').notNull(),
    grand_total: decimal('grand_total', { precision: 10, scale: 2 }).notNull(),
    // GST Breakdown
    cgst: decimal('cgst', { precision: 10, scale: 2 }).default('0').notNull(),
    sgst: decimal('sgst', { precision: 10, scale: 2 }).default('0').notNull(),
    igst: decimal('igst', { precision: 10, scale: 2 }).default('0').notNull(),
    tax_type: varchar('tax_type', { length: 20 }).default('cgst_sgst').notNull(),
    // Files
    pdf_url: text('pdf_url'),
    pdf_path: text('pdf_path'),
    pdf_generated_at: timestamp('pdf_generated_at'),
    // Reason for version
    reason: text('reason').$type<InvoiceReason>().default('INITIAL').notNull(),
    // Audit fields
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  table => ({
    invoiceIdIdx: index('invoice_versions_invoice_id_idx').on(table.invoice_id),
    versionNumberIdx: index('invoice_versions_version_number_idx').on(table.version_number),
  })
);

/**
 * Invoice line items table schema
 * Stores snapshot of line items for each invoice version
 */
export const invoiceLineItems = pgTable(
  'invoice_line_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    invoice_version_id: uuid('invoice_version_id')
      .notNull()
      .references(() => invoiceVersions.id, { onDelete: 'cascade' }),
    product_name: varchar('product_name', { length: 255 }).notNull(),
    sku: varchar('sku', { length: 100 }).notNull(),
    hsn_code: varchar('hsn_code', { length: 10 }),
    quantity: integer('quantity').notNull(),
    unit_price: decimal('unit_price', { precision: 10, scale: 2 }).notNull(),
    tax_rate: decimal('tax_rate', { precision: 5, scale: 2 }).default('0').notNull(),
    cgst_amount: decimal('cgst_amount', { precision: 10, scale: 2 }).default('0').notNull(),
    sgst_amount: decimal('sgst_amount', { precision: 10, scale: 2 }).default('0').notNull(),
    igst_amount: decimal('igst_amount', { precision: 10, scale: 2 }).default('0').notNull(),
    line_total: decimal('line_total', { precision: 10, scale: 2 }).notNull(),
    // Audit fields
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  table => ({
    invoiceVersionIdIdx: index('invoice_line_items_invoice_version_id_idx').on(table.invoice_version_id),
  })
);

// Export types for TypeScript
export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;
export type InvoiceVersion = typeof invoiceVersions.$inferSelect;
export type NewInvoiceVersion = typeof invoiceVersions.$inferInsert;
export type InvoiceLineItem = typeof invoiceLineItems.$inferSelect;
export type NewInvoiceLineItem = typeof invoiceLineItems.$inferInsert;
