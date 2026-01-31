/**
 * Invoice Feature Index
 *
 * Central exports for invoice management
 */

import { Router } from 'express';
import Route from '../../interfaces/route.interface';

class InvoiceRoute implements Route {
  public path = '/invoices';
  public router = Router();

  constructor() {
    // Routes are initialized asynchronously via init()
  }

  public async init() {
    // Dynamic imports to avoid circular dependency
    const { default: downloadInvoiceRouter } = await import('./apis/download-invoice');
    const { default: getOrderInvoiceRouter } = await import('./apis/get-order-invoice');
    const { default: adminInvoiceRouter } = await import('./apis/admin-invoice');

    // Mount all invoice routes
    // Regular invoice routes: /invoices/...
    this.router.use(this.path, downloadInvoiceRouter);
    // Mount getOrderInvoiceRouter at root to support /api/orders/:id/invoices/latest
    // This allows it to appear under the 'orders' resource hierarchy despite being in invoice feature
    this.router.use('/', getOrderInvoiceRouter);

    // Admin invoice routes: /admin/...
    // - /admin/orders/:id/invoices
    // - /admin/invoices/:versionId/email
    this.router.use('/admin', adminInvoiceRouter);
  }
}

// Main route export
export default InvoiceRoute;

// Services
export { invoiceService, InvoiceService } from './services/invoice.service';

// Shared resources
export * from './shared/invoice.schema';
export * from './shared/interface';
