/**
 * Centralized Email Service
 *
 * Provides a unified interface for sending all types of emails:
 * - Admin invitations
 * - Order confirmations
 * - Payment notifications
 * - Shipping updates
 * - Stock alerts
 *
 * Uses template-based approach for consistency and maintainability.
 */

import { createTransporter, EMAIL_SENDER, APP_NAME } from './emailConfig';
import { logger } from '../logging/logger';

// ============================================
// EMAIL TEMPLATE INTERFACES
// ============================================

export interface InvitationEmailData {
  to: string;
  firstName: string;
  lastName: string;
  inviteLink: string;
  expiresIn?: string;
}

export interface OrderConfirmationEmailData {
  to: string;
  userName: string;
  orderNumber: string;
  items: Array<{
    name: string;
    quantity: number;
    price: string;
  }>;
  subtotal: string;
  tax: string;
  shipping: string;
  total: string;
  currency: string;
}

export interface PaymentConfirmationEmailData {
  to: string;
  orderNumber: string;
  amount: string;
  currency: string;
  paymentMethod: string;
  paidAt: Date;
}

export interface PaymentFailedEmailData {
  to: string;
  amount: string;
  currency: string;
  paymentMethod: string;
  errorMessage: string;
}

export interface PaymentRefundedEmailData {
  to: string;
  amount: string;
  currency: string;
  reason?: string;
  refundedAt: Date;
}

export interface OrderShippedEmailData {
  to: string;
  orderNumber: string;
  trackingNumber?: string;
  carrier?: string;
  estimatedDelivery?: Date;
}

export interface StockAlertEmailData {
  to: string;
  productName: string;
  productId: string;
  currentStock?: number;
  threshold?: number;
  alertType: 'low_stock' | 'out_of_stock';
}

export interface OtpEmailData {
  to: string;
  otp: string;
  expiresIn?: string;
}

// ============================================
// EMAIL SERVICE CLASS
// ============================================

class EmailService {
  private transporter = createTransporter();

  /**
   * Send admin invitation email
   */
  async sendInvitationEmail(data: InvitationEmailData): Promise<void> {
    const { to, firstName, lastName, inviteLink, expiresIn = '24 hours' } = data;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1a73e8; margin-bottom: 10px;">${APP_NAME}</h1>
        </div>

        <h2 style="color: #333;">Welcome, ${firstName} ${lastName}!</h2>

        <p style="color: #555; font-size: 16px; line-height: 1.6;">
          You've been invited to join <strong>${APP_NAME}</strong>.
        </p>

        <p style="color: #555; font-size: 16px; line-height: 1.6;">
          Click the button below to accept your invitation and create your account:
        </p>

        <p style="text-align: center; margin: 35px 0;">
          <a href="${inviteLink}"
             style="display: inline-block; background: #1a73e8; color: white;
                    padding: 16px 32px; text-decoration: none; border-radius: 6px;
                    font-weight: bold; font-size: 16px;">
            Accept Invitation & Register
          </a>
        </p>

        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #1a73e8;">
          <p style="margin: 0; color: #555;">
            <strong>📧 Your Email:</strong> ${to}
          </p>
          <p style="margin: 10px 0 0 0; color: #777; font-size: 14px;">
            You'll create your own password during registration.
          </p>
        </div>

        <p style="color: #888; font-size: 14px;">
          <strong>⏰ This invitation will expire in ${expiresIn}.</strong>
        </p>

        <p style="color: #888; font-size: 13px; margin-top: 20px;">
          If the button doesn't work, copy and paste this link into your browser:
          <br>
          <a href="${inviteLink}" style="color: #1a73e8; word-break: break-all;">${inviteLink}</a>
        </p>

        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

        <p style="color: #999; font-size: 12px; text-align: center;">
          If you did not expect this invitation, you can safely ignore this email.
          <br><br>
          This is an automated message from ${APP_NAME}.
        </p>
      </div>
    `;

    await this.sendEmail({
      to,
      subject: `You're Invited to Join ${APP_NAME}`,
      html,
    });
  }

  /**
   * Send order confirmation email
   */
  async sendOrderConfirmationEmail(data: OrderConfirmationEmailData): Promise<void> {
    const { to, userName, orderNumber, items, subtotal, tax, shipping, total, currency } = data;

    const itemsHtml = items
      .map(
        item => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #eee;">${item.name}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${currency} ${item.price}</td>
      </tr>
    `
      )
      .join('');

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1a73e8;">${APP_NAME}</h1>
        </div>

        <h2 style="color: #333;">Order Confirmed!</h2>

        <p style="color: #555; font-size: 16px;">
          Thank you for your order, ${userName}!
        </p>

        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #555;">
            <strong>Order Number:</strong> #${orderNumber}
          </p>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="background: #f8f9fa;">
              <th style="padding: 12px; text-align: left;">Item</th>
              <th style="padding: 12px; text-align: center;">Quantity</th>
              <th style="padding: 12px; text-align: right;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div style="text-align: right; margin: 20px 0;">
          <p style="margin: 5px 0; color: #555;">Subtotal: ${currency} ${subtotal}</p>
          <p style="margin: 5px 0; color: #555;">Tax: ${currency} ${tax}</p>
          <p style="margin: 5px 0; color: #555;">Shipping: ${currency} ${shipping}</p>
          <p style="margin: 10px 0 0 0; font-size: 18px; font-weight: bold; color: #333;">
            Total: ${currency} ${total}
          </p>
        </div>

        <p style="color: #555; margin-top: 30px;">
          We'll notify you when your order ships.
        </p>

        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

        <p style="color: #999; font-size: 12px; text-align: center;">
          Thank you for shopping with ${APP_NAME}!
        </p>
      </div>
    `;

    await this.sendEmail({
      to,
      subject: `Order Confirmed - #${orderNumber}`,
      html,
    });
  }

  /**
   * Send payment confirmation email
   */
  async sendPaymentConfirmationEmail(data: PaymentConfirmationEmailData): Promise<void> {
    const { to, orderNumber, amount, currency, paymentMethod, paidAt } = data;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1a73e8;">${APP_NAME}</h1>
        </div>

        <h2 style="color: #28a745;">✓ Payment Received</h2>

        <p style="color: #555; font-size: 16px;">
          We've successfully received your payment!
        </p>

        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0; color: #555;"><strong>Order Number:</strong> #${orderNumber}</p>
          <p style="margin: 5px 0; color: #555;"><strong>Amount:</strong> ${currency} ${amount}</p>
          <p style="margin: 5px 0; color: #555;"><strong>Payment Method:</strong> ${paymentMethod}</p>
          <p style="margin: 5px 0; color: #555;"><strong>Date:</strong> ${paidAt.toLocaleString()}</p>
        </div>

        <p style="color: #555;">
          Your order is now being processed and will be shipped soon.
        </p>

        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

        <p style="color: #999; font-size: 12px; text-align: center;">
          Thank you for your payment!
        </p>
      </div>
    `;

    await this.sendEmail({
      to,
      subject: `Payment Received - Order #${orderNumber}`,
      html,
    });
  }

  /**
   * Send payment failed email
   */
  async sendPaymentFailedEmail(data: PaymentFailedEmailData): Promise<void> {
    const { to, amount, currency, paymentMethod, errorMessage } = data;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1a73e8;">${APP_NAME}</h1>
        </div>

        <h2 style="color: #dc3545;">⚠️ Payment Failed</h2>

        <p style="color: #555; font-size: 16px;">
          We were unable to process your payment.
        </p>

        <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
          <p style="margin: 5px 0; color: #555;"><strong>Amount:</strong> ${currency} ${amount}</p>
          <p style="margin: 5px 0; color: #555;"><strong>Payment Method:</strong> ${paymentMethod}</p>
          <p style="margin: 10px 0 0 0; color: #856404;"><strong>Error:</strong> ${errorMessage}</p>
        </div>

        <p style="color: #555;">
          Please try again or use a different payment method.
        </p>

        <p style="text-align: center; margin: 30px 0;">
          <a href="#" style="display: inline-block; background: #1a73e8; color: white;
                             padding: 14px 28px; text-decoration: none; border-radius: 6px;
                             font-weight: bold;">
            Try Again
          </a>
        </p>

        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

        <p style="color: #999; font-size: 12px; text-align: center;">
          If you continue to have issues, please contact our support team.
        </p>
      </div>
    `;

    await this.sendEmail({
      to,
      subject: 'Payment Failed - Action Required',
      html,
    });
  }

  /**
   * Send payment refunded email
   */
  async sendPaymentRefundedEmail(data: PaymentRefundedEmailData): Promise<void> {
    const { to, amount, currency, reason, refundedAt } = data;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1a73e8;">${APP_NAME}</h1>
        </div>

        <h2 style="color: #28a745;">✓ Refund Processed</h2>

        <p style="color: #555; font-size: 16px;">
          Your refund has been processed successfully.
        </p>

        <div style="background: #d1ecf1; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #17a2b8;">
          <p style="margin: 5px 0; color: #0c5460;"><strong>Refund Amount:</strong> ${currency} ${amount}</p>
          ${reason ? `<p style="margin: 5px 0; color: #0c5460;"><strong>Reason:</strong> ${reason}</p>` : ''}
          <p style="margin: 5px 0; color: #0c5460;"><strong>Date:</strong> ${refundedAt.toLocaleString()}</p>
        </div>

        <p style="color: #555;">
          The refund will appear in your account within 5-10 business days, depending on your payment provider.
        </p>

        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

        <p style="color: #999; font-size: 12px; text-align: center;">
          Thank you for your patience.
        </p>
      </div>
    `;

    await this.sendEmail({
      to,
      subject: 'Refund Processed',
      html,
    });
  }

  /**
   * Send order shipped email
   */
  async sendOrderShippedEmail(data: OrderShippedEmailData): Promise<void> {
    const { to, orderNumber, trackingNumber, carrier, estimatedDelivery } = data;

    const trackingHtml = trackingNumber
      ? `
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 5px 0; color: #555;"><strong>Tracking Number:</strong> ${trackingNumber}</p>
        ${carrier ? `<p style="margin: 5px 0; color: #555;"><strong>Carrier:</strong> ${carrier}</p>` : ''}
        ${estimatedDelivery
        ? `<p style="margin: 5px 0; color: #555;"><strong>Estimated Delivery:</strong> ${estimatedDelivery.toLocaleDateString()}</p>`
        : ''
      }
      </div>
    `
      : '';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1a73e8;">${APP_NAME}</h1>
        </div>

        <h2 style="color: #28a745;">📦 Your Order Has Shipped!</h2>

        <p style="color: #555; font-size: 16px;">
          Great news! Your order is on its way.
        </p>

        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #555;"><strong>Order Number:</strong> #${orderNumber}</p>
        </div>

        ${trackingHtml}

        <p style="color: #555;">
          ${trackingNumber ? 'You can track your shipment using the tracking number above.' : "We'll update you with tracking information soon."}
        </p>

        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

        <p style="color: #999; font-size: 12px; text-align: center;">
          Thank you for shopping with ${APP_NAME}!
        </p>
      </div>
    `;

    await this.sendEmail({
      to,
      subject: `Your Order Has Shipped - #${orderNumber}`,
      html,
    });
  }

  /**
   * Send stock alert email (for admins)
   */
  async sendStockAlertEmail(data: StockAlertEmailData): Promise<void> {
    const { to, productName, productId, currentStock, threshold, alertType } = data;

    const isOutOfStock = alertType === 'out_of_stock';
    const color = isOutOfStock ? '#dc3545' : '#ffc107';
    const emoji = isOutOfStock ? '🚨' : '⚠️';
    const title = isOutOfStock ? 'OUT OF STOCK ALERT' : 'LOW STOCK ALERT';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1a73e8;">${APP_NAME}</h1>
        </div>

        <h2 style="color: ${color};">${emoji} ${title}</h2>

        <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${color};">
          <p style="margin: 5px 0; color: #856404;"><strong>Product:</strong> ${productName}</p>
          <p style="margin: 5px 0; color: #856404;"><strong>Product ID:</strong> ${productId}</p>
          ${currentStock !== undefined ? `<p style="margin: 5px 0; color: #856404;"><strong>Current Stock:</strong> ${currentStock}</p>` : ''}
          ${threshold !== undefined ? `<p style="margin: 5px 0; color: #856404;"><strong>Threshold:</strong> ${threshold}</p>` : ''}
        </div>

        <p style="color: #555; font-weight: bold;">
          ${isOutOfStock ? 'This product is now out of stock! Immediate restocking required.' : 'Stock levels are running low. Please reorder soon.'}
        </p>

        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

        <p style="color: #999; font-size: 12px; text-align: center;">
          This is an automated alert from ${APP_NAME} inventory system.
        </p>
      </div>
    `;

    await this.sendEmail({
      to,
      subject: `${emoji} ${title}: ${productName}`,
      html,
    });
  }

  /**
   * Send OTP verification email
   */
  async sendOtpEmail(data: OtpEmailData): Promise<void> {
    const { to, otp, expiresIn = '5 minutes' } = data;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1a73e8; margin-bottom: 10px;">${APP_NAME}</h1>
        </div>

        <h2 style="color: #333; text-align: center;">Email Verification</h2>

        <p style="color: #555; font-size: 16px; line-height: 1.6; text-align: center;">
          Use the following code to verify your email address:
        </p>

        <div style="background: linear-gradient(135deg, #1a73e8 0%, #0d47a1 100%); padding: 30px; border-radius: 12px; margin: 30px 0; text-align: center;">
          <p style="font-size: 40px; font-weight: bold; color: white; letter-spacing: 8px; margin: 0; font-family: 'Courier New', monospace;">
            ${otp}
          </p>
        </div>

        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #ffc107;">
          <p style="margin: 0; color: #555; font-size: 14px;">
            <strong>⏰ This code will expire in ${expiresIn}.</strong>
          </p>
          <p style="margin: 10px 0 0 0; color: #777; font-size: 13px;">
            If you didn't request this code, you can safely ignore this email.
          </p>
        </div>

        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

        <p style="color: #999; font-size: 12px; text-align: center;">
          This is an automated message from ${APP_NAME}.
          <br>Please do not reply to this email.
        </p>
      </div>
    `;

    await this.sendEmail({
      to,
      subject: `${otp} is your ${APP_NAME} verification code`,
      html,
    });
  }

  /**
   * Generic send email method
   */
  private async sendEmail(options: {
    to: string | string[];
    subject: string;
    html: string;
    cc?: string | string[];
    bcc?: string | string[];
  }): Promise<void> {
    const { to, subject, html, cc, bcc } = options;

    const mailOptions = {
      from: `"${APP_NAME}" <${EMAIL_SENDER}>`,
      to: Array.isArray(to) ? to.join(', ') : to,
      cc: cc ? (Array.isArray(cc) ? cc.join(', ') : cc) : undefined,
      bcc: bcc ? (Array.isArray(bcc) ? bcc.join(', ') : bcc) : undefined,
      subject,
      html,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`Email sent successfully`, {
        to: Array.isArray(to) ? to : [to],
        subject,
        messageId: info.messageId,
      });
    } catch (error) {
      logger.error('Failed to send email', {
        to: Array.isArray(to) ? to : [to],
        subject,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}

// Export singleton instance
export const emailService = new EmailService();

// Export class for testing
export { EmailService };
