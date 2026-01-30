import dotenv from 'dotenv';
dotenv.config({ quiet: true });

import { db } from '../src/database';
import { notificationTemplates } from '../src/features/notifications/shared';
import { logger } from '../src/utils';

const templates = [
    {
        code: 'ORDER_CREATED',
        name: 'Order Created',
        description: 'Sent when a new order is placed',
        category: 'order',
        subject: 'Order {{orderNumber}} Confirmed - Anant Enterprises',
        body_html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4CAF50;">Thank you for your order, {{userName}}!</h2>
        <p>Your order <strong>{{orderNumber}}</strong> has been confirmed and is being processed.</p>
        <h3>Order Summary:</h3>
        <p><strong>Total:</strong> {{currency}} {{total}}</p>
        <p>We'll send you another email when your order ships.</p>
        <div style="margin-top: 20px;">
          <a href="{{orderUrl}}" style="background: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">View Order Details</a>
        </div>
        <p style="margin-top: 30px; color: #666; font-size: 12px;">
          If you have any questions, please contact our support team.
        </p>
      </div>
    `,
        body_text: 'Thank you for your order, {{userName}}! Your order {{orderNumber}} has been confirmed. Total: {{currency}} {{total}}. View your order at: {{orderUrl}}',
        sms_template: 'Hi {{userName}}, your order {{orderNumber}} ({{currency}} {{total}}) has been confirmed. Track it at: {{orderUrl}}',
        in_app_title: 'Order Confirmed',
        in_app_message: 'Your order {{orderNumber}} has been placed successfully. Total: {{currency}} {{total}}',
        variables: ['userName', 'orderNumber', 'total', 'currency', 'orderUrl'],
        is_active: true,
    },
    {
        code: 'ORDER_SHIPPED',
        name: 'Order Shipped',
        description: 'Sent when order is dispatched for delivery',
        category: 'order',
        subject: 'Your Order {{orderNumber}} Has Shipped! 📦',
        body_html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2196F3;">Great news, {{userName}}!</h2>
        <p>Your order <strong>{{orderNumber}}</strong> is on its way to you!</p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 4px; margin: 20px 0;">
          <p><strong>Tracking Number:</strong> {{trackingNumber}}</p>
          <p><strong>Carrier:</strong> {{carrier}}</p>
          <p><strong>Estimated Delivery:</strong> {{estimatedDelivery}}</p>
        </div>
        <div style="margin-top: 20px;">
          <a href="{{trackingUrl}}" style="background: #2196F3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Track Your Shipment</a>
        </div>
      </div>
    `,
        body_text: 'Hi {{userName}}, your order {{orderNumber}} has shipped! Track it with {{carrier}} using tracking number: {{trackingNumber}}. Estimated delivery: {{estimatedDelivery}}. Track at: {{trackingUrl}}',
        sms_template: 'Your order {{orderNumber}} has shipped via {{carrier}}. Tracking: {{trackingNumber}}. Track at: {{trackingUrl}}',
        in_app_title: 'Order Shipped',
        in_app_message: 'Your order {{orderNumber}} is on its way! Tracking: {{trackingNumber}}',
        variables: ['userName', 'orderNumber', 'trackingNumber', 'carrier', 'estimatedDelivery', 'trackingUrl'],
        is_active: true,
    },
    {
        code: 'ORDER_DELIVERED',
        name: 'Order Delivered',
        description: 'Sent when order is successfully delivered',
        category: 'order',
        subject: 'Your Order {{orderNumber}} Has Been Delivered 🎉',
        body_html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4CAF50;">Delivery Confirmed!</h2>
        <p>Hi {{userName}}, your order <strong>{{orderNumber}}</strong> has been delivered successfully.</p>
        <p>We hope you enjoy your purchase!</p>
        <p>If you have any questions or concerns about your order, please don't hesitate to contact our support team.</p>
        <div style="margin-top: 20px;">
          <a href="{{reviewUrl}}" style="background: #FF9800; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Write a Review</a>
        </div>
      </div>
    `,
        body_text: 'Hi {{userName}}, your order {{orderNumber}} has been delivered. We hope you enjoy your purchase! Write a review at: {{reviewUrl}}',
        in_app_title: 'Order Delivered',
        in_app_message: 'Your order {{orderNumber}} has been delivered. Enjoy your purchase!',
        variables: ['userName', 'orderNumber', 'reviewUrl'],
        is_active: true,
    },
    {
        code: 'PAYMENT_CAPTURED',
        name: 'Payment Successful',
        description: 'Sent when payment is successfully processed',
        category: 'payment',
        subject: 'Payment Received - {{currency}} {{amount}}',
        body_html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4CAF50;">Payment Confirmed</h2>
        <p>Hi {{userName}}, we've successfully received your payment of <strong>{{currency}} {{amount}}</strong>.</p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 4px; margin: 20px 0;">
          <p><strong>Transaction ID:</strong> {{transactionId}}</p>
          <p><strong>Payment Method:</strong> {{paymentMethod}}</p>
          <p><strong>Amount:</strong> {{currency}} {{amount}}</p>
        </div>
        <p>Your order is now being processed and will be shipped soon.</p>
      </div>
    `,
        body_text: 'Hi {{userName}}, we have received your payment of {{currency}} {{amount}}. Transaction ID: {{transactionId}}. Payment Method: {{paymentMethod}}',
        in_app_title: 'Payment Successful',
        in_app_message: 'Payment of {{currency}} {{amount}} received successfully.',
        variables: ['userName', 'amount', 'currency', 'transactionId', 'paymentMethod'],
        is_active: true,
    },
    {
        code: 'LOW_STOCK_ALERT',
        name: 'Low Stock Alert (Admin)',
        description: 'Alert administrators when inventory is running low',
        category: 'inventory',
        subject: '⚠️ Low Stock Alert: {{productName}}',
        body_html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #F44336;">⚠️ Low Stock Alert</h2>
        <p>Product <strong>{{productName}}</strong> is running low on stock and requires attention.</p>
        <div style="background: #fff3cd; padding: 15px; border-radius: 4px; margin: 20px 0; border-left: 4px solid #F44336;">
          <p><strong>Current Stock:</strong> {{currentStock}} units</p>
          <p><strong>Low Stock Threshold:</strong> {{threshold}} units</p>
        </div>
        <p>Please reorder inventory to avoid potential stockouts and maintain customer satisfaction.</p>
        <div style="margin-top: 20px;">
          <a href="{{inventoryUrl}}" style="background: #F44336; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">View Inventory</a>
        </div>
      </div>
    `,
        body_text: 'Low Stock Alert: {{productName}} has only {{currentStock}} units left (threshold: {{threshold}}). Please reorder inventory. View at: {{inventoryUrl}}',
        in_app_title: 'Low Stock Alert',
        in_app_message: '{{productName}} has only {{currentStock}} units left in stock.',
        variables: ['productName', 'currentStock', 'threshold', 'inventoryUrl'],
        is_active: true,
    },
    {
        code: 'USER_WELCOME',
        name: 'Welcome Email',
        description: 'Welcome new users to the platform',
        category: 'user',
        subject: 'Welcome to Anant Enterprises, {{userName}}! 👋',
        body_html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4CAF50;">Welcome to Anant Enterprises!</h2>
        <p>Hi {{userName}},</p>
        <p>Thank you for creating an account with us. We're thrilled to have you as part of our community!</p>
        <p>Explore our wide range of products and enjoy exclusive deals tailored just for you.</p>
        <div style="margin-top: 20px;">
          <a href="{{shopUrl}}" style="background: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Start Shopping</a>
        </div>
        <p style="margin-top: 30px; color: #666; font-size: 12px;">
          Need help? Contact our support team anytime.
        </p>
      </div>
    `,
        body_text: 'Welcome to Anant Enterprises, {{userName}}! Thank you for joining us. Start shopping at: {{shopUrl}}',
        in_app_title: 'Welcome!',
        in_app_message: 'Welcome to Anant Enterprises, {{userName}}! Start exploring our products.',
        variables: ['userName', 'shopUrl'],
        is_active: true,
    },
    {
        code: 'NEW_ORDER_RECEIVED',
        name: 'New Order Received (Admin)',
        description: 'Alert administrators when a new order is placed',
        category: 'order',
        subject: '🛒 New Order #{{orderNumber}} - {{currency}} {{total}}',
        body_html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2196F3;">🛒 New Order Received!</h2>
        <p>A new order has been placed by <strong>{{customerName}}</strong>.</p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 4px; margin: 20px 0;">
          <p><strong>Order Number:</strong> #{{orderNumber}}</p>
          <p><strong>Customer:</strong> {{customerName}} ({{customerEmail}})</p>
          <p><strong>Items:</strong> {{itemCount}} item(s)</p>
          <p><strong>Total:</strong> {{currency}} {{total}}</p>
        </div>
        <div style="margin-top: 20px;">
          <a href="{{orderUrl}}" style="background: #2196F3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">View Order Details</a>
        </div>
        <p style="margin-top: 30px; color: #666; font-size: 12px;">
          This is an automated notification from your store.
        </p>
      </div>
    `,
        body_text: 'New Order #{{orderNumber}} from {{customerName}} ({{customerEmail}}). Total: {{currency}} {{total}}. Items: {{itemCount}}. View at: {{orderUrl}}',
        sms_template: 'New Order #{{orderNumber}} from {{customerName}}. Total: {{currency}} {{total}}. View order in admin panel.',
        in_app_title: 'New Order Received',
        in_app_message: 'Order #{{orderNumber}} ({{currency}} {{total}}) from {{customerName}}',
        variables: ['orderNumber', 'customerName', 'customerEmail', 'total', 'currency', 'itemCount', 'orderUrl'],
        is_active: true,
    },
];

async function seedTemplates() {
    try {
        logger.info('🌱 Seeding notification templates...');

        for (const template of templates) {
            await db
                .insert(notificationTemplates)
                .values(template)
                .onConflictDoUpdate({
                    target: notificationTemplates.code,
                    set: {
                        ...template,
                        updated_at: new Date(),
                    },
                });

            logger.info(`✅ Seeded template: ${template.code}`);
        }

        logger.info(`✅ All ${templates.length} notification templates seeded successfully!`);
        process.exit(0);
    } catch (error) {
        logger.error('❌ Failed to seed templates', { error });
        process.exit(1);
    }
}

seedTemplates();
