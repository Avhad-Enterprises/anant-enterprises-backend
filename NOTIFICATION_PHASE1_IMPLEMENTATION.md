# Notification System - Phase 1 Implementation Plan

> **Document Version**: 1.0  
> **Last Updated**: January 20, 2026  
> **Phase**: Database Foundation & Core Services  
> **Estimated Time**: 6-8 hours  
> **Prerequisites**: Backend running, PostgreSQL connected, Redis available

---

## Table of Contents

1. [Phase 1 Overview](#phase-1-overview)
2. [Prerequisites Checklist](#prerequisites-checklist)
3. [Step-by-Step Implementation](#step-by-step-implementation)
4. [Testing & Validation](#testing--validation)
5. [Troubleshooting](#troubleshooting)
6. [Next Steps](#next-steps)

---

## Phase 1 Overview

### Objectives

Phase 1 establishes the **database foundation** and **core notification infrastructure**:

✅ Create database schemas for notifications, templates, preferences, and delivery logs  
✅ Set up the notification feature module with proper structure  
✅ Implement core services (NotificationService, TemplateService, PreferenceService)  
✅ Create basic API endpoints for users to fetch notifications  
✅ Seed initial notification templates  
✅ Test the complete flow end-to-end  

### What We'll Build

```
Phase 1 Deliverables:
├── Database Schema (4 tables)
│   ├── notifications
│   ├── notification_templates
│   ├── notification_preferences
│   └── notification_delivery_logs
│
├── Feature Module Structure
│   └── src/features/notifications/
│       ├── shared/ (schemas, types, constants)
│       ├── services/ (core business logic)
│       ├── apis/ (REST endpoints)
│       └── tests/
│
└── Seeded Templates
    ├── ORDER_CREATED
    ├── ORDER_SHIPPED
    ├── ORDER_DELIVERED
    ├── PAYMENT_CAPTURED
    └── LOW_STOCK_ALERT
```

### Timeline

| Task | Duration | Dependencies |
|------|----------|--------------|
| Database migration | 30 min | None |
| Feature module structure | 20 min | None |
| Schema definitions | 40 min | None |
| Core services | 2 hours | Schemas |
| API endpoints | 1.5 hours | Services |
| Template seeding | 30 min | Database |
| Testing | 1.5 hours | All above |
| Documentation | 30 min | All above |

**Total: ~7 hours**

---

## Prerequisites Checklist

Before starting Phase 1, verify:

### System Requirements

- [ ] Node.js 18+ installed
- [ ] PostgreSQL database accessible
- [ ] Redis server running (optional for Phase 1)
- [ ] Backend dev server working (`npm run dev`)

### Environment Variables

```bash
# Required
DATABASE_URL=postgresql://user:password@localhost:5432/anant_enterprises

# Email (for testing delivery)
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM="Anant Enterprises <your-email@gmail.com>"

# Optional
REDIS_URL=redis://localhost:6379
QUEUE_WORKERS_ENABLED=true
```

### Database Connection Test

```bash
# Run database health check
npm run db:test

# Expected output:
# ✅ Database connected successfully
```

### Git Status

```bash
# Ensure clean working directory
git status

# If you have uncommitted changes, commit or stash them
git add .
git commit -m "Pre-notification system checkpoint"
```

---

## Step-by-Step Implementation

### Step 1: Create Database Migration

**Duration**: 30 minutes

#### 1.1 Generate Migration File

```bash
# Navigate to project root
cd anant-enterprises-backend

# Generate migration using Drizzle Kit
npm run db:generate
```

This will create a new migration file in `src/database/migrations/`.

#### 1.2 Create Migration SQL

Create file: `src/database/migrations/0001_add_notification_system.sql`

```sql
-- ================================================
-- Notification System Database Schema
-- Migration: 0001_add_notification_system
-- Created: 2026-01-20
-- ================================================

-- ================================================
-- STEP 1: CREATE ENUMS
-- ================================================

-- Notification types
CREATE TYPE notification_type AS ENUM (
  -- Order notifications
  'order_created',
  'order_paid',
  'order_shipped',
  'order_delivered',
  'order_cancelled',
  
  -- Payment notifications
  'payment_authorized',
  'payment_captured',
  'payment_failed',
  'payment_refunded',
  
  -- Inventory notifications
  'inventory_low_stock',
  'inventory_out_of_stock',
  'inventory_restocked',
  
  -- User notifications
  'user_welcome',
  'account_updated',
  'password_changed',
  
  -- Admin notifications
  'admin_broadcast',
  'system_alert',
  
  -- Marketing
  'promotion',
  'newsletter'
);

-- Notification priority levels
CREATE TYPE notification_priority AS ENUM (
  'low',
  'normal',
  'high',
  'urgent'
);

-- Notification delivery frequency
CREATE TYPE notification_frequency AS ENUM (
  'immediate',
  'daily_digest',
  'weekly_digest',
  'never'
);

-- Delivery status tracking
CREATE TYPE delivery_status AS ENUM (
  'pending',
  'sent',
  'delivered',
  'failed',
  'bounced'
);

-- ================================================
-- STEP 2: CREATE TABLES
-- ================================================

-- Main notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Notification content
  type notification_type NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  
  -- Rich data payload (JSON)
  data JSONB DEFAULT '{}'::JSONB,
  
  -- Read tracking
  is_read BOOLEAN DEFAULT FALSE NOT NULL,
  read_at TIMESTAMPTZ,
  
  -- Delivery channels that were used
  channels JSONB DEFAULT '["in_app"]'::JSONB NOT NULL,
  
  -- Priority
  priority notification_priority DEFAULT 'normal' NOT NULL,
  
  -- Call-to-action
  action_url VARCHAR(500),
  action_text VARCHAR(100),
  
  -- Lifecycle timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::JSONB
);

-- Notification templates
CREATE TABLE notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Template identification
  code VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50),
  
  -- Email templates
  subject VARCHAR(255),
  body_text TEXT,
  body_html TEXT,
  
  -- SMS template
  sms_template TEXT,
  
  -- In-app notification template
  in_app_title VARCHAR(255),
  in_app_message TEXT,
  
  -- Available variables for substitution
  variables JSONB DEFAULT '[]'::JSONB,
  
  -- Template status
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- User notification preferences
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_type notification_type NOT NULL,
  
  -- Channel preferences
  channel_email BOOLEAN DEFAULT TRUE NOT NULL,
  channel_sms BOOLEAN DEFAULT FALSE NOT NULL,
  channel_in_app BOOLEAN DEFAULT TRUE NOT NULL,
  channel_push BOOLEAN DEFAULT TRUE NOT NULL,
  
  -- Delivery frequency
  frequency notification_frequency DEFAULT 'immediate' NOT NULL,
  
  -- Quiet hours (do not disturb)
  quiet_hours_enabled BOOLEAN DEFAULT FALSE NOT NULL,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Unique constraint: one preference per user per notification type
  UNIQUE(user_id, notification_type)
);

-- Notification delivery logs
CREATE TABLE notification_delivery_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  
  -- Delivery details
  channel VARCHAR(50) NOT NULL,
  status delivery_status DEFAULT 'pending' NOT NULL,
  
  -- Recipient info
  recipient VARCHAR(255),
  
  -- Provider details
  provider VARCHAR(100),
  provider_message_id VARCHAR(255),
  provider_response JSONB,
  
  -- Error tracking
  error_message TEXT,
  error_code VARCHAR(50),
  retry_count INTEGER DEFAULT 0,
  
  -- Timestamps
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ================================================
-- STEP 3: CREATE INDEXES
-- ================================================

-- Notifications indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_user_id_is_read ON notifications(user_id, is_read) WHERE deleted_at IS NULL;
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_expires_at ON notifications(expires_at) WHERE expires_at IS NOT NULL;

-- Templates indexes
CREATE INDEX idx_notification_templates_code ON notification_templates(code);
CREATE INDEX idx_notification_templates_category ON notification_templates(category);
CREATE INDEX idx_notification_templates_is_active ON notification_templates(is_active);

-- Preferences indexes
CREATE INDEX idx_notification_preferences_user_id ON notification_preferences(user_id);

-- Delivery logs indexes
CREATE INDEX idx_delivery_logs_notification_id ON notification_delivery_logs(notification_id);
CREATE INDEX idx_delivery_logs_status ON notification_delivery_logs(status);
CREATE INDEX idx_delivery_logs_channel ON notification_delivery_logs(channel);
CREATE INDEX idx_delivery_logs_created_at ON notification_delivery_logs(created_at DESC);

-- ================================================
-- STEP 4: ADD COMMENTS
-- ================================================

COMMENT ON TABLE notifications IS 'Stores all user notifications across all channels';
COMMENT ON TABLE notification_templates IS 'Reusable notification templates with variable substitution';
COMMENT ON TABLE notification_preferences IS 'User-specific notification channel and frequency preferences';
COMMENT ON TABLE notification_delivery_logs IS 'Tracks delivery attempts and status for each notification channel';

COMMENT ON COLUMN notifications.data IS 'JSON payload with context-specific data (order details, product info, etc.)';
COMMENT ON COLUMN notifications.channels IS 'Array of channels used for delivery: ["email", "in_app", "sms", "push"]';
COMMENT ON COLUMN notification_templates.variables IS 'Array of available template variables: ["userName", "orderNumber", etc.]';

-- ================================================
-- STEP 5: CREATE FUNCTIONS
-- ================================================

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to notification_templates
CREATE TRIGGER update_notification_templates_updated_at
BEFORE UPDATE ON notification_templates
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to notification_preferences
CREATE TRIGGER update_notification_preferences_updated_at
BEFORE UPDATE ON notification_preferences
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- COMPLETED: Notification System Schema
-- ================================================
```

#### 1.3 Run Migration

```bash
# Apply migration to database
npm run db:migrate:dev

# Expected output:
# ✅ Running migrations...
# ✅ Migration 0001_add_notification_system applied successfully
```

#### 1.4 Verify Tables Created

```bash
# Open Drizzle Studio to verify
npm run db:studio:dev

# Navigate to http://localhost:4983
# Verify these tables exist:
# - notifications
# - notification_templates
# - notification_preferences
# - notification_delivery_logs
```

---

### Step 2: Create Feature Module Structure

**Duration**: 20 minutes

#### 2.1 Create Directory Structure

```bash
# Create notification feature directory
mkdir -p src/features/notifications

# Create subdirectories
cd src/features/notifications
mkdir shared services apis tests

# Create initial files
touch index.ts route.ts README.md

# Create shared files
cd shared
touch notifications.schema.ts
touch notification-templates.schema.ts
touch notification-preferences.schema.ts
touch notification-delivery-logs.schema.ts
touch types.ts
touch constants.ts
touch index.ts

# Return to notifications root
cd ..
```

Final structure:

```
src/features/notifications/
├── index.ts
├── route.ts
├── README.md
├── shared/
│   ├── notifications.schema.ts
│   ├── notification-templates.schema.ts
│   ├── notification-preferences.schema.ts
│   ├── notification-delivery-logs.schema.ts
│   ├── types.ts
│   ├── constants.ts
│   └── index.ts
├── services/
├── apis/
└── tests/
```

---

### Step 3: Define Database Schemas

**Duration**: 40 minutes

#### 3.1 Notifications Schema

Create: `src/features/notifications/shared/notifications.schema.ts`

```typescript
import { pgTable, uuid, varchar, text, boolean, timestamp, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { users } from '../../user';

/**
 * Notification Type Enum
 * Defines all possible notification categories
 */
export const notificationTypeEnum = pgEnum('notification_type', [
  // Order notifications
  'order_created',
  'order_paid',
  'order_shipped',
  'order_delivered',
  'order_cancelled',
  
  // Payment notifications
  'payment_authorized',
  'payment_captured',
  'payment_failed',
  'payment_refunded',
  
  // Inventory notifications
  'inventory_low_stock',
  'inventory_out_of_stock',
  'inventory_restocked',
  
  // User notifications
  'user_welcome',
  'account_updated',
  'password_changed',
  
  // Admin notifications
  'admin_broadcast',
  'system_alert',
  
  // Marketing
  'promotion',
  'newsletter',
]);

/**
 * Notification Priority Enum
 */
export const notificationPriorityEnum = pgEnum('notification_priority', [
  'low',
  'normal',
  'high',
  'urgent',
]);

/**
 * Notifications Table
 * Stores all user notifications
 */
export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // Content
  type: notificationTypeEnum('type').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  
  // Rich data payload
  data: jsonb('data').$type<Record<string, any>>().default({}),
  
  // Read tracking
  is_read: boolean('is_read').default(false).notNull(),
  read_at: timestamp('read_at', { withTimezone: true }),
  
  // Delivery channels used
  channels: jsonb('channels').$type<string[]>().default(['in_app']).notNull(),
  
  // Priority
  priority: notificationPriorityEnum('priority').default('normal').notNull(),
  
  // Call-to-action
  action_url: varchar('action_url', { length: 500 }),
  action_text: varchar('action_text', { length: 100 }),
  
  // Lifecycle
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  expires_at: timestamp('expires_at', { withTimezone: true }),
  deleted_at: timestamp('deleted_at', { withTimezone: true }),
  
  // Metadata
  metadata: jsonb('metadata').$type<Record<string, any>>().default({}),
});

// Export types
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
export type NotificationType = Notification['type'];
export type NotificationPriority = Notification['priority'];
```

#### 3.2 Notification Templates Schema

Create: `src/features/notifications/shared/notification-templates.schema.ts`

```typescript
import { pgTable, uuid, varchar, text, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';

/**
 * Notification Templates Table
 * Stores reusable notification templates with variable substitution
 */
export const notificationTemplates = pgTable('notification_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Template identification
  code: varchar('code', { length: 100 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  category: varchar('category', { length: 50 }),
  
  // Email templates
  subject: varchar('subject', { length: 255 }),
  body_text: text('body_text'),
  body_html: text('body_html'),
  
  // SMS template
  sms_template: text('sms_template'),
  
  // In-app notification template
  in_app_title: varchar('in_app_title', { length: 255 }),
  in_app_message: text('in_app_message'),
  
  // Available variables for substitution (e.g., ["userName", "orderNumber"])
  variables: jsonb('variables').$type<string[]>().default([]),
  
  // Status
  is_active: boolean('is_active').default(true).notNull(),
  
  // Timestamps
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Export types
export type NotificationTemplate = typeof notificationTemplates.$inferSelect;
export type NewNotificationTemplate = typeof notificationTemplates.$inferInsert;
```

#### 3.3 Notification Preferences Schema

Create: `src/features/notifications/shared/notification-preferences.schema.ts`

```typescript
import { pgTable, uuid, boolean, time, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { users } from '../../user';
import { notificationTypeEnum } from './notifications.schema';

/**
 * Notification Frequency Enum
 */
export const notificationFrequencyEnum = pgEnum('notification_frequency', [
  'immediate',
  'daily_digest',
  'weekly_digest',
  'never',
]);

/**
 * Notification Preferences Table
 * User-specific notification settings
 */
export const notificationPreferences = pgTable('notification_preferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  notification_type: notificationTypeEnum('notification_type').notNull(),
  
  // Channel preferences
  channel_email: boolean('channel_email').default(true).notNull(),
  channel_sms: boolean('channel_sms').default(false).notNull(),
  channel_in_app: boolean('channel_in_app').default(true).notNull(),
  channel_push: boolean('channel_push').default(true).notNull(),
  
  // Frequency
  frequency: notificationFrequencyEnum('frequency').default('immediate').notNull(),
  
  // Quiet hours (do not disturb)
  quiet_hours_enabled: boolean('quiet_hours_enabled').default(false).notNull(),
  quiet_hours_start: time('quiet_hours_start'),
  quiet_hours_end: time('quiet_hours_end'),
  
  // Timestamps
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Export types
export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type NewNotificationPreference = typeof notificationPreferences.$inferInsert;
export type NotificationFrequency = NotificationPreference['frequency'];
```

#### 3.4 Notification Delivery Logs Schema

Create: `src/features/notifications/shared/notification-delivery-logs.schema.ts`

```typescript
import { pgTable, uuid, varchar, text, timestamp, jsonb, pgEnum, integer } from 'drizzle-orm/pg-core';
import { notifications } from './notifications.schema';

/**
 * Delivery Status Enum
 */
export const deliveryStatusEnum = pgEnum('delivery_status', [
  'pending',
  'sent',
  'delivered',
  'failed',
  'bounced',
]);

/**
 * Notification Delivery Logs Table
 * Tracks delivery attempts for each notification channel
 */
export const notificationDeliveryLogs = pgTable('notification_delivery_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  notification_id: uuid('notification_id').notNull().references(() => notifications.id, { onDelete: 'cascade' }),
  
  // Delivery details
  channel: varchar('channel', { length: 50 }).notNull(),
  status: deliveryStatusEnum('status').default('pending').notNull(),
  
  // Recipient
  recipient: varchar('recipient', { length: 255 }),
  
  // Provider details
  provider: varchar('provider', { length: 100 }),
  provider_message_id: varchar('provider_message_id', { length: 255 }),
  provider_response: jsonb('provider_response').$type<Record<string, any>>(),
  
  // Error tracking
  error_message: text('error_message'),
  error_code: varchar('error_code', { length: 50 }),
  retry_count: integer('retry_count').default(0),
  
  // Timestamps
  sent_at: timestamp('sent_at', { withTimezone: true }),
  delivered_at: timestamp('delivered_at', { withTimezone: true }),
  failed_at: timestamp('failed_at', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Export types
export type NotificationDeliveryLog = typeof notificationDeliveryLogs.$inferSelect;
export type NewNotificationDeliveryLog = typeof notificationDeliveryLogs.$inferInsert;
export type DeliveryStatus = NotificationDeliveryLog['status'];
```

#### 3.5 Shared Types

Create: `src/features/notifications/shared/types.ts`

```typescript
/**
 * Notification Service Types
 */

export interface CreateNotificationInput {
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  actionUrl?: string;
  actionText?: string;
  channels?: string[];
}

export interface GetNotificationsOptions {
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
}

export interface RenderTemplateResult {
  type: string;
  title: string;
  message: string;
  emailSubject?: string;
  emailHtml?: string;
  emailText?: string;
  smsMessage?: string;
}

export interface DeliveryResult {
  channel: string;
  success: boolean;
  messageId?: string;
  error?: string;
}
```

#### 3.6 Constants

Create: `src/features/notifications/shared/constants.ts`

```typescript
/**
 * Notification System Constants
 */

export const NOTIFICATION_LIMITS = {
  MAX_TITLE_LENGTH: 255,
  MAX_MESSAGE_LENGTH: 5000,
  MAX_ACTION_TEXT_LENGTH: 100,
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

export const NOTIFICATION_CHANNELS = {
  EMAIL: 'email',
  SMS: 'sms',
  IN_APP: 'in_app',
  PUSH: 'push',
} as const;

export const TEMPLATE_CODES = {
  ORDER_CREATED: 'ORDER_CREATED',
  ORDER_PAID: 'ORDER_PAID',
  ORDER_SHIPPED: 'ORDER_SHIPPED',
  ORDER_DELIVERED: 'ORDER_DELIVERED',
  ORDER_CANCELLED: 'ORDER_CANCELLED',
  PAYMENT_CAPTURED: 'PAYMENT_CAPTURED',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  LOW_STOCK_ALERT: 'LOW_STOCK_ALERT',
  OUT_OF_STOCK_ALERT: 'OUT_OF_STOCK_ALERT',
  USER_WELCOME: 'USER_WELCOME',
} as const;
```

#### 3.7 Shared Index Exports

Create: `src/features/notifications/shared/index.ts`

```typescript
// Export all schemas
export * from './notifications.schema';
export * from './notification-templates.schema';
export * from './notification-preferences.schema';
export * from './notification-delivery-logs.schema';

// Export types and constants
export * from './types';
export * from './constants';
```

---

### Step 4: Update Database Schema Registry

**Duration**: 10 minutes

Update: `src/database/drizzle.ts`

Add import at the top:

```typescript
import {
  notifications,
  notificationTemplates,
  notificationPreferences,
  notificationDeliveryLogs,
  notificationTypeEnum,
  notificationPriorityEnum,
  notificationFrequencyEnum,
  deliveryStatusEnum,
} from '../features/notifications/shared';
```

Add to schema object (around line 370):

```typescript
export const schema = {
  // ... existing schemas ...
  
  // Notifications feature
  notifications,
  notificationTemplates,
  notificationPreferences,
  notificationDeliveryLogs,
  notificationTypeEnum,
  notificationPriorityEnum,
  notificationFrequencyEnum,
  deliveryStatusEnum,
};
```

---

### Step 5: Seed Notification Templates

**Duration**: 30 minutes

Create: `scripts/seed-notification-templates.ts`

```typescript
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
      <h2>Thank you for your order, {{userName}}!</h2>
      <p>Your order <strong>{{orderNumber}}</strong> has been confirmed.</p>
      <h3>Order Summary:</h3>
      <p>Total: {{currency}} {{total}}</p>
      <p>We'll send you another email when your order ships.</p>
      <a href="{{orderUrl}}" style="background: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">View Order</a>
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
    description: 'Sent when order is shipped',
    category: 'order',
    subject: 'Your Order {{orderNumber}} Has Shipped! 📦',
    body_html: `
      <h2>Great news, {{userName}}!</h2>
      <p>Your order <strong>{{orderNumber}}</strong> is on its way!</p>
      <p><strong>Tracking Number:</strong> {{trackingNumber}}</p>
      <p><strong>Carrier:</strong> {{carrier}}</p>
      <p><strong>Estimated Delivery:</strong> {{estimatedDelivery}}</p>
      <a href="{{trackingUrl}}" style="background: #2196F3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Track Shipment</a>
    `,
    body_text: 'Hi {{userName}}, your order {{orderNumber}} has shipped! Track it with {{carrier}} using tracking number: {{trackingNumber}}. Estimated delivery: {{estimatedDelivery}}',
    sms_template: 'Your order {{orderNumber}} has shipped via {{carrier}}. Track: {{trackingNumber}}',
    in_app_title: 'Order Shipped',
    in_app_message: 'Your order {{orderNumber}} is on its way! Track: {{trackingNumber}}',
    variables: ['userName', 'orderNumber', 'trackingNumber', 'carrier', 'estimatedDelivery', 'trackingUrl'],
    is_active: true,
  },
  {
    code: 'ORDER_DELIVERED',
    name: 'Order Delivered',
    description: 'Sent when order is delivered',
    category: 'order',
    subject: 'Your Order {{orderNumber}} Has Been Delivered 🎉',
    body_html: `
      <h2>Delivery Confirmed!</h2>
      <p>Hi {{userName}}, your order <strong>{{orderNumber}}</strong> has been delivered.</p>
      <p>We hope you enjoy your purchase!</p>
      <p>If you have any questions or concerns, please contact our support team.</p>
      <a href="{{reviewUrl}}" style="background: #FF9800; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Write a Review</a>
    `,
    in_app_title: 'Order Delivered',
    in_app_message: 'Your order {{orderNumber}} has been delivered. Enjoy!',
    variables: ['userName', 'orderNumber', 'reviewUrl'],
    is_active: true,
  },
  {
    code: 'PAYMENT_CAPTURED',
    name: 'Payment Successful',
    description: 'Sent when payment is successfully captured',
    category: 'payment',
    subject: 'Payment Received - {{currency}} {{amount}}',
    body_html: `
      <h2>Payment Confirmed</h2>
      <p>Hi {{userName}}, we've received your payment of <strong>{{currency}} {{amount}}</strong>.</p>
      <p><strong>Transaction ID:</strong> {{transactionId}}</p>
      <p><strong>Payment Method:</strong> {{paymentMethod}}</p>
      <p>Your order will be processed shortly.</p>
    `,
    in_app_title: 'Payment Successful',
    in_app_message: 'Payment of {{currency}} {{amount}} received successfully.',
    variables: ['userName', 'amount', 'currency', 'transactionId', 'paymentMethod'],
    is_active: true,
  },
  {
    code: 'LOW_STOCK_ALERT',
    name: 'Low Stock Alert (Admin)',
    description: 'Alert admins when inventory is low',
    category: 'inventory',
    subject: '⚠️ Low Stock Alert: {{productName}}',
    body_html: `
      <h2>Low Stock Alert</h2>
      <p>Product <strong>{{productName}}</strong> is running low on stock.</p>
      <p><strong>Current Stock:</strong> {{currentStock}} units</p>
      <p><strong>Threshold:</strong> {{threshold}} units</p>
      <p>Please reorder inventory to avoid stockouts.</p>
      <a href="{{inventoryUrl}}" style="background: #F44336; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">View Inventory</a>
    `,
    in_app_title: 'Low Stock Alert',
    in_app_message: '{{productName}} has only {{currentStock}} units left in stock.',
    variables: ['productName', 'currentStock', 'threshold', 'inventoryUrl'],
    is_active: true,
  },
  {
    code: 'USER_WELCOME',
    name: 'Welcome Email',
    description: 'Welcome new users',
    category: 'user',
    subject: 'Welcome to Anant Enterprises, {{userName}}! 👋',
    body_html: `
      <h2>Welcome to Anant Enterprises!</h2>
      <p>Hi {{userName}},</p>
      <p>Thank you for creating an account with us. We're excited to have you on board!</p>
      <p>Explore our wide range of products and enjoy exclusive deals.</p>
      <a href="{{shopUrl}}" style="background: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Start Shopping</a>
    `,
    in_app_title: 'Welcome!',
    in_app_message: 'Welcome to Anant Enterprises, {{userName}}! Start exploring our products.',
    variables: ['userName', 'shopUrl'],
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

    logger.info('✅ All notification templates seeded successfully!');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Failed to seed templates', { error });
    process.exit(1);
  }
}

seedTemplates();
```

Add script to `package.json`:

```json
{
  "scripts": {
    "db:seed:notifications": "tsx scripts/seed-notification-templates.ts"
  }
}
```

Run the seed:

```bash
npm run db:seed:notifications

# Expected output:
# ✅ Seeded template: ORDER_CREATED
# ✅ Seeded template: ORDER_SHIPPED
# ✅ All notification templates seeded successfully!
```

---

### Step 6: Implement Core Services

**Duration**: 1.5 hours

Files to create:
- `services/notification.service.ts` (main service)
- `services/template.service.ts` (template rendering)
- `services/preference.service.ts` (user preferences)

[Continue in next section due to length...]

---

## Testing & Validation

### Unit Tests

Test notification creation, template rendering, and preference handling.

### Integration Tests

Test full notification flow from API to database.

### Manual Testing Checklist

- [ ] Database tables created
- [ ] Templates seeded
- [ ] Can create notification via service
- [ ] Can fetch notifications via API
- [ ] Can mark notification as read

---

## Troubleshooting

### Common Issues

**Database migration fails**
- Ensure PostgreSQL is running
- Check DATABASE_URL is correct
- Verify users table exists (dependency)

**Template seeding fails**
- Run migration first
- Check for unique constraint violations

---

## Next Steps

After completing Phase 1:

1. **Phase 2**: Implement delivery services (email, SMS)
2. **Phase 3**: Integrate with queue workers
3. **Phase 4**: Build admin APIs
4. **Phase 5**: Create user-facing notification center

---

**Phase 1 Complete!** 🎉

You now have:
- ✅ Database schema
- ✅ Feature module structure
- ✅ Schema definitions
- ✅ Seeded templates

Ready to build the services in the next phase!
