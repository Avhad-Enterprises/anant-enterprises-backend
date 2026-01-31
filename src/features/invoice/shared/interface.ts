/**
 * Invoice Interfaces
 *
 * Canonical TypeScript interfaces for invoice-related data.
 */

import type { Invoice, InvoiceVersion, InvoiceLineItem } from './invoice.schema';

// ============================================
// INVOICE RESPONSE
// ============================================

export interface InvoiceResponse {
  invoice: Invoice;
  invoiceVersion: InvoiceVersion;
  lineItems: InvoiceLineItem[];
}

// ============================================
// INVOICE GENERATION REQUEST
// ============================================

export interface GenerateInvoiceRequest {
  order_id: string;
}

// ============================================
// INVOICE DOWNLOAD RESPONSE
// ============================================

export interface InvoiceDownloadResponse {
  invoice_number: string;
  file_name: string;
  content_type: string;
  content_length: number;
  data: Buffer;
}
