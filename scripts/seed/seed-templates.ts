
import { db } from '../../src/database';
import { notificationTemplates } from '../../src/features/notifications/shared/notification-templates.schema';
import { logger } from '../../src/utils';

async function seedTemplates() {
    logger.info('🌱 Seeding notification templates...');

    const templates = [
        {
            code: 'ORDER_CREATED',
            name: 'Order Confirmation',
            description: 'Sent to customer when an order is successfully placed',
            category: 'orders',
            variables: ['userName', 'orderNumber', 'total', 'currency', 'items', 'orderUrl'],
            subject: 'Order Confirmed - #{{orderNumber}}',
            body_html: `
        <h1>Order Confirmed!</h1>
        <p>Hello {{userName}},</p>
        <p>Thank you for your order #{{orderNumber}}.</p>
        <p><strong>Total:</strong> {{currency}} {{total}}</p>
        <p>We will notify you when your order ships.</p>
        <br>
        <a href="{{orderUrl}}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Order</a>
      `,
            body_text: 'Hello {{userName}}, Thank you for your order #{{orderNumber}}. Total: {{currency}} {{total}}. We will notify you when your order ships.',
            in_app_title: 'Order Placed Successfully',
            in_app_message: 'Your order #{{orderNumber}} has been confirmed.',
            is_active: true
        },
        {
            code: 'NEW_ORDER_RECEIVED',
            name: 'New Order Alert (Admin)',
            description: 'Sent to admins when a new order is received',
            category: 'orders',
            variables: ['orderNumber', 'customerName', 'total', 'orderUrl'],
            subject: 'New Order Received - #{{orderNumber}}',
            body_html: `
        <h1>New Order Received</h1>
        <p><strong>Order:</strong> #{{orderNumber}}</p>
        <p><strong>Customer:</strong> {{customerName}}</p>
        <p><strong>Amount:</strong> {{total}}</p>
        <br>
        <a href="{{orderUrl}}" style="background-color: #2196F3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Manage Order</a>
      `,
            body_text: 'New Order Received: #{{orderNumber}} from {{customerName}}. Total: {{total}}.',
            in_app_title: 'New Order Received',
            in_app_message: 'Order #{{orderNumber}} placed by {{customerName}}.',
            is_active: true
        },
        {
            code: 'PAYMENT_CONFIRMED',
            name: 'Payment Received',
            description: 'Sent when payment is successfully captured',
            category: 'payments',
            variables: ['orderNumber', 'amount', 'currency', 'paymentMethod', 'paidAt'],
            subject: 'Payment Received - Order #{{orderNumber}}',
            body_html: `
        <h1>Payment Received</h1>
        <p>We've received your payment of <strong>{{currency}} {{amount}}</strong> for Order #{{orderNumber}}.</p>
        <p>Method: {{paymentMethod}}</p>
      `,
            body_text: 'Payment Received of {{currency}} {{amount}} for Order #{{orderNumber}} via {{paymentMethod}}.',
            in_app_title: 'Payment Successful',
            in_app_message: 'Payment of {{currency}} {{amount}} received for order #{{orderNumber}}.',
            is_active: true
        },
        {
            code: 'ORDER_SHIPPED',
            name: 'Order Shipped',
            description: 'Sent when order status changes to shipped',
            category: 'orders',
            variables: ['orderNumber', 'trackingNumber', 'carrier', 'estimatedDelivery'],
            subject: 'Your Order Has Shipped - #{{orderNumber}}',
            body_html: `
        <h1>Your Order Has Shipped!</h1>
        <p>Order #{{orderNumber}} is on its way.</p>
        <p><strong>Carrier:</strong> {{carrier}}</p>
        <p><strong>Tracking:</strong> {{trackingNumber}}</p>
      `,
            body_text: 'Order #{{orderNumber}} has shipped via {{carrier}}. Tracking: {{trackingNumber}}.',
            in_app_title: 'Order Shipped',
            in_app_message: 'Order #{{orderNumber}} is on its way!',
            is_active: true
        },
        {
            code: 'ORDER_DELIVERED',
            name: 'Order Delivered',
            description: 'Sent when order is marked as delivered',
            category: 'orders',
            variables: ['orderNumber', 'deliveredAt'],
            subject: 'Your Order Has Been Delivered - #{{orderNumber}}',
            body_html: `
        <h1>Order Delivered</h1>
        <p>Your order #{{orderNumber}} has been delivered.</p>
        <p>Enjoy your purchase!</p>
      `,
            body_text: 'Order #{{orderNumber}} has been delivered. Enjoy!',
            in_app_title: 'Order Delivered',
            in_app_message: 'Order #{{orderNumber}} has been delivered successfully.',
            is_active: true
        },
        {
            code: 'PAYMENT_FAILED',
            name: 'Payment Failed',
            description: 'Sent when payment capture fails',
            category: 'payments',
            variables: ['amount', 'currency', 'paymentMethod', 'errorMessage'],
            subject: 'Payment Failed - Action Required',
            body_html: `
        <h1>Payment Failed</h1>
        <p>We couldn't process your payment of <strong>{{currency}} {{amount}}</strong>.</p>
        <p><strong>Method:</strong> {{paymentMethod}}</p>
        <p><strong>Error:</strong> {{errorMessage}}</p>
        <p>Please try again or use a different payment method.</p>
      `,
            body_text: 'Payment Failed: {{currency}} {{amount}} via {{paymentMethod}}. Error: {{errorMessage}}. Please try again.',
            in_app_title: 'Payment Failed',
            in_app_message: 'Payment of {{currency}} {{amount}} failed. Please check your details.',
            is_active: true
        },
        {
            code: 'PAYMENT_REFUNDED',
            name: 'Refund Processed',
            description: 'Sent when a refund is issued',
            category: 'payments',
            variables: ['amount', 'currency', 'reason', 'refundedAt'],
            subject: 'Refund Processed',
            body_html: `
        <h1>Refund Processed</h1>
        <p>We've refunded <strong>{{currency}} {{amount}}</strong> to your account.</p>
        <p><strong>Reason:</strong> {{reason}}</p>
      `,
            body_text: 'Refund Processed: {{currency}} {{amount}}. Reason: {{reason}}.',
            in_app_title: 'Refund Initiated',
            in_app_message: 'Refund of {{currency}} {{amount}} has been processed.',
            is_active: true
        }
    ];

    for (const tmpl of templates) {
        await db
            .insert(notificationTemplates)
            .values(tmpl)
            .onConflictDoUpdate({
                target: notificationTemplates.code,
                set: {
                    name: tmpl.name,
                    subject: tmpl.subject,
                    body_html: tmpl.body_html,
                    body_text: tmpl.body_text,
                    in_app_title: tmpl.in_app_title,
                    in_app_message: tmpl.in_app_message,
                    variables: tmpl.variables,
                    updated_at: new Date()
                }
            });

        logger.info(`✅ Template processed: ${tmpl.code}`);
    }

    logger.info('✨ Template seeding completed!');
    process.exit(0);
}

seedTemplates().catch((err) => {
    logger.error('Failed to seed templates', err);
    process.exit(1);
});
