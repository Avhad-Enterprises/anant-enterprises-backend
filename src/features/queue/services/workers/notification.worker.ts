/**
 * Notification Worker
 *
 * Processes notification events:
 * - SEND_EMAIL: Send email using nodemailer
 * - SEND_SMS: Send SMS (placeholder for future)
 */

import { Job } from 'bullmq';
import { BaseWorker } from './base.worker';
import { QueueName } from '../../shared/config';
import { QueueEventType } from '../../shared/types';
import type { EmailNotificationData, SMSNotificationData } from '../../shared/types';
import { logger } from '../../../../utils';
import { createTransporter, EMAIL_SENDER, APP_NAME } from '../../../../utils/email/emailConfig';
import { notificationService } from '../../../notifications/services';
import type {
  SendNotificationJobData,
  BatchNotificationJobData,
} from '../../jobs/notification.job';

/**
 * Notification Worker Class
 */
class NotificationWorker extends BaseWorker {
  constructor() {
    super(QueueName.NOTIFICATIONS);
  }

  protected async processJob(job: Job): Promise<void> {
    // Handle notification service events (job.data IS the payload directly)
    if (job.name === 'send-notification') {
      await this.handleSendNotification(job.data as SendNotificationJobData);
      return;
    }

    if (job.name === 'batch-notification') {
      await this.handleBatchNotification(job.data as BatchNotificationJobData);
      return;
    }

    // Handle legacy event publisher events (wrapped in {type, data})
    const { type, data } = job.data;
    switch (type) {
      case QueueEventType.SEND_EMAIL:
        await this.handleSendEmail(data as EmailNotificationData);
        break;
      case QueueEventType.SEND_SMS:
        await this.handleSendSMS(data as SMSNotificationData);
        break;
      default:
        logger.warn('Unknown notification event type', { type, jobName: job.name });
    }
  }

  /**
   * Handle send-notification job from notification service
   */
  private async handleSendNotification(data: SendNotificationJobData): Promise<void> {
    logger.info('Processing send-notification job', {
      userId: data.userId,
      templateCode: data.templateCode,
    });

    try {
      const notification = await notificationService.createFromTemplate(
        data.userId,
        data.templateCode,
        data.variables,
        data.options
      );

      if (!notification) {
        logger.warn('Notification not created (filtered by preferences)', {
          userId: data.userId,
          templateCode: data.templateCode,
        });
        return;
      }

      logger.info('Notification created successfully', {
        notificationId: notification.id,
        userId: data.userId,
      });
    } catch (error) {
      logger.error('Failed to create notification', {
        userId: data.userId,
        templateCode: data.templateCode,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error; // Trigger retry
    }
  }

  /**
   * Handle batch-notification job
   */
  private async handleBatchNotification(data: BatchNotificationJobData): Promise<void> {
    logger.info('Processing batch-notification job', {
      userCount: data.userIds.length,
      templateCode: data.templateCode,
      options: data.options, // Debug: log options including actionUrl
    });

    // Process in chunks of 50
    const chunkSize = 50;
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < data.userIds.length; i += chunkSize) {
      const chunk = data.userIds.slice(i, i + chunkSize);

      const results = await Promise.allSettled(
        chunk.map(userId =>
          notificationService.createFromTemplate(
            userId,
            data.templateCode,
            data.variables,
            data.options
          )
        )
      );

      results.forEach(result => {
        if (result.status === 'fulfilled') {
          successCount++;
        } else {
          failCount++;
          logger.error('Failed to create notification in batch', {
            error: result.reason,
          });
        }
      });
    }

    logger.info('Batch notification processed', {
      total: data.userIds.length,
      success: successCount,
      failed: failCount,
    });
  }

  /**
   * Handle SEND_EMAIL event
   */
  private async handleSendEmail(data: EmailNotificationData): Promise<void> {
    logger.info('Processing SEND_EMAIL', { to: data.to, subject: data.subject });

    try {
      const transporter = createTransporter();

      // Build email content
      let htmlContent = data.html;
      let textContent = data.text;

      // If template is provided, use template-based content
      if (data.template && data.templateData) {
        const { html, text } = this.renderTemplate(data.template, data.templateData);
        htmlContent = html;
        textContent = text;
      }

      // Send the email
      const mailOptions = {
        from: `"${APP_NAME}" <${EMAIL_SENDER}>`,
        to: Array.isArray(data.to) ? data.to.join(', ') : data.to,
        cc: data.cc ? (Array.isArray(data.cc) ? data.cc.join(', ') : data.cc) : undefined,
        bcc: data.bcc ? (Array.isArray(data.bcc) ? data.bcc.join(', ') : data.bcc) : undefined,
        subject: data.subject,
        html: htmlContent,
        text: textContent,
        attachments: data.attachments,
      };

      await transporter.sendMail(mailOptions);

      logger.info('Email sent successfully', { to: data.to, subject: data.subject });
    } catch (error) {
      logger.error('Failed to send email', { to: data.to, subject: data.subject, error });
      throw error; // Trigger retry
    }
  }

  /**
   * Handle SEND_SMS event
   * Placeholder for future SMS integration
   */
  private async handleSendSMS(data: SMSNotificationData): Promise<void> {
    logger.info('Processing SEND_SMS', { to: data.to });

    try {
      // TODO: Integrate with SMS provider (Twilio, MSG91, etc.)
      logger.warn('SMS sending not implemented yet', { to: data.to, message: data.message });
    } catch (error) {
      logger.error('Failed to send SMS', { to: data.to, error });
      throw error;
    }
  }

  /**
   * Render email template
   * Simple template rendering - can be extended with handlebars/ejs
   */
  private renderTemplate(
    templateName: string,
    data: Record<string, unknown>
  ): { html: string; text: string } {
    // Simple template system - can be extended later
    const templates: Record<
      string,
      (data: Record<string, unknown>) => { html: string; text: string }
    > = {
      order_confirmation: d => ({
        html: `
          <h1>Order Confirmed!</h1>
          <p>Thank you for your order #${d.orderNumber}</p>
          <p>Hello ${d.userName},</p>
          <p>Your order total: ${d.currency} ${d.total}</p>
          <p>We'll notify you when your order ships.</p>
        `,
        text: `Order Confirmed! Order #${d.orderNumber}. Total: ${d.currency} ${d.total}`,
      }),

      payment_confirmation: d => ({
        html: `
          <h1>Payment Received</h1>
          <p>We've received your payment of ${d.currency} ${d.amount}</p>
          <p>Payment Method: ${d.paymentMethod}</p>
        `,
        text: `Payment Received: ${d.currency} ${d.amount}`,
      }),

      payment_failed: d => ({
        html: `
          <h1>Payment Failed</h1>
          <p>We couldn't process your payment of ${d.currency} ${d.amount}</p>
          <p>Error: ${d.errorMessage}</p>
          <p>Please try again or use a different payment method.</p>
        `,
        text: `Payment Failed: ${d.errorMessage}`,
      }),

      payment_refunded: d => ({
        html: `
          <h1>Refund Processed</h1>
          <p>We've refunded ${d.currency} ${d.amount} to your account.</p>
          <p>Reason: ${d.reason || 'Customer request'}</p>
        `,
        text: `Refund Processed: ${d.currency} ${d.amount}`,
      }),

      order_shipped: d => ({
        html: `
          <h1>Your Order Has Shipped!</h1>
          <p>Order #${d.orderNumber} is on its way.</p>
          <p>Carrier: ${d.carrier}</p>
          <p>Tracking: ${d.trackingNumber}</p>
        `,
        text: `Order Shipped: #${d.orderNumber}. Tracking: ${d.trackingNumber}`,
      }),

      low_stock_alert: d => ({
        html: `
          <h1>⚠️ Low Stock Alert</h1>
          <p>Product: ${d.productName}</p>
          <p>Current Stock: ${d.currentStock}</p>
          <p>Threshold: ${d.threshold}</p>
        `,
        text: `Low Stock: ${d.productName} (${d.currentStock} left)`,
      }),

      out_of_stock_alert: d => ({
        html: `
          <h1>🚨 OUT OF STOCK</h1>
          <p>Product: ${d.productName}</p>
          <p>Product ID: ${d.productId}</p>
          <p>Immediate action required!</p>
        `,
        text: `OUT OF STOCK: ${d.productName}`,
      }),

      invoice_generated: d => ({
        html: `
          <h1>Invoice Generated</h1>
          <p>Hello ${d.customerName},</p>
          <p>Please find attached the invoice for Order #${d.orderNumber}.</p>
          <p>Invoice Number: ${d.invoiceNumber}</p>
          <p>Date: ${d.date}</p>
          <p>Thank you for your business!</p>
        `,
        text: `Invoice Generated: ${d.invoiceNumber} for Order #${d.orderNumber}.`,
      }),
    };

    const template = templates[templateName];
    if (!template) {
      logger.warn('Template not found, using default', { templateName });
      return {
        html: `<pre>${JSON.stringify(data, null, 2)}</pre>`,
        text: JSON.stringify(data),
      };
    }

    return template(data);
  }
}

export const notificationWorker = new NotificationWorker();
export { NotificationWorker };
