/**
 * Invoice Worker
 *
 * Processes invoice-related events:
 * - GENERATE_INVOICE: Generates a new invoice version
 */

import { Job } from 'bullmq';
import { BaseWorker } from './base.worker';
import { QueueName } from '../../shared/config';
import { QueueEventType } from '../../shared/types';
import type { GenerateInvoiceData } from '../../shared/types';
import { logger } from '../../../../utils';
import { invoiceService } from '../../../invoice';
import { db } from '../../../../database';
import { orders } from '../../../orders/shared/orders.schema';
import { eq } from 'drizzle-orm';

/**
 * Invoice Worker Class
 * Handles all invoice-related queue events
 */
class InvoiceWorker extends BaseWorker {
  constructor() {
    // We are using the ORDERS queue for now as settled in event-publisher
    super(QueueName.ORDERS);
  }

  /**
   * Process invoice events
   */
  protected async processJob(job: Job): Promise<void> {
    const { type, data } = job.data;

    switch (type) {
      case QueueEventType.GENERATE_INVOICE:
        await this.handleGenerateInvoice(data as GenerateInvoiceData);
        break;
      // Add more cases here if needed (e.g. INVOICE_SENT)
      default:
        // Ignore other event types (handled by other workers on the same queue)
        break;
    }
  }

  /**
   * Handle GENERATE_INVOICE event
   */
  private async handleGenerateInvoice(data: GenerateInvoiceData): Promise<void> {
    logger.info('Processing GENERATE_INVOICE', {
      orderId: data.orderId,
      force: data.forceNewVersion,
    });

    try {
      const invoiceData = await invoiceService.generateInvoice(data.orderId, {
        forceNewVersion: data.forceNewVersion,
      });

      // Fetch order details for order number
      const [order] = await db.select().from(orders).where(eq(orders.id, data.orderId));

      // Send email if invoice generated
      if (invoiceData && invoiceData.version && invoiceData.version.customer_email) {
        // Dynamic import to avoid circular dependency
        const { eventPublisher } = await import('../event-publisher.service');

        await eventPublisher.publishEmailNotification({
          to: invoiceData.version.customer_email,
          subject: `Invoice #${invoiceData.version.invoice_number} for your order ${order?.order_number || data.orderId}`,
          template: 'invoice_generated',
          templateData: {
            customerName: invoiceData.version.customer_name,
            orderNumber: order?.order_number || data.orderId,
            invoiceNumber: invoiceData.version.invoice_number,
            date: new Date(invoiceData.version.created_at).toLocaleDateString(),
          },
          attachments: invoiceData.version.pdf_url
            ? [
                {
                  filename: `${invoiceData.version.invoice_number}.pdf`,
                  path: invoiceData.version.pdf_url,
                },
              ]
            : [],
          priority: 2,
        });

        logger.info('Invoice email queued', { invoiceNumber: invoiceData.version.invoice_number });

        // Update invoice status to sent
        await invoiceService.updateInvoiceStatus(invoiceData.id, 'sent');
      }

      logger.info('GENERATE_INVOICE processed successfully', { orderId: data.orderId });
    } catch (error) {
      logger.error('Failed to process GENERATE_INVOICE', { orderId: data.orderId, error });
      throw error; // Trigger retry
    }
  }
}

// Export singleton instance
export const invoiceWorker = new InvoiceWorker();

// Export class for testing
export { InvoiceWorker };

