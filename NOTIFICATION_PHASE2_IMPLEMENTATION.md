# Notification System - Phase 2 Implementation Plan

> **Document Version**: 1.0  
> **Last Updated**: January 20, 2026  
> **Phase**: Core Services & API Endpoints  
> **Estimated Time**: 8-10 hours  
> **Prerequisites**: Phase 1 Complete ✅

---

## Table of Contents

1. [Phase 2 Overview](#phase-2-overview)
2. [Prerequisites Checklist](#prerequisites-checklist)
3. [Step-by-Step Implementation](#step-by-step-implementation)
4. [Testing & Validation](#testing--validation)
5. [Troubleshooting](#troubleshooting)
6. [Next Steps](#next-steps)

---

## Phase 2 Overview

### Objectives

Phase 2 builds the **business logic layer** and **API layer** on top of the Phase 1 database foundation:

✅ Implement core notification services  
✅ Create template rendering engine with variable substitution  
✅ Build user preference management  
✅ Implement multi-channel delivery services  
✅ Create user-facing API endpoints  
✅ Create admin API endpoints  
✅ Integrate with existing queue system  
✅ Add comprehensive error handling  

### What We'll Build

```
Phase 2 Deliverables:
├── Core Services (4)
│   ├── NotificationService - CRUD operations
│   ├── TemplateService - Template rendering
│   ├── PreferenceService - User preferences
│   └── DeliveryService - Multi-channel delivery
│
├── User APIs (8 endpoints)
│   ├── GET /api/notifications
│   ├── GET /api/notifications/:id
│   ├── PATCH /api/notifications/:id/read
│   ├── PATCH /api/notifications/read-all
│   ├── DELETE /api/notifications/:id
│   ├── GET /api/notifications/unread-count
│   ├── GET /api/notifications/preferences
│   └── PUT /api/notifications/preferences
│
├── Admin APIs (6 endpoints)
│   ├── POST /api/admin/notifications/broadcast
│   ├── GET /api/admin/notifications
│   ├── GET /api/admin/notification-templates
│   ├── POST /api/admin/notification-templates
│   ├── PUT /api/admin/notification-templates/:id
│   └── GET /api/admin/notifications/stats
│
└── Queue Integration
    └── Extend NotificationWorker
```

### Timeline

| Task | Duration | Dependencies |
|------|----------|--------------|
| Template Service | 1 hour | Phase 1 schemas |
| Preference Service | 1 hour | Phase 1 schemas |
| Notification Service | 2 hours | Template, Preference services |
| Delivery Service | 1.5 hours | Notification service |
| User API endpoints | 2 hours | Core services |
| Admin API endpoints | 1.5 hours | Core services |
| Route setup | 30 min | All APIs |
| Testing | 1.5 hours | All above |

**Total: ~10 hours**

---

## Prerequisites Checklist

Before starting Phase 2, verify:

### Phase 1 Completion

- [x] Database migration applied
- [x] All 4 tables created
- [x] Schemas implemented in Drizzle
- [x] Database registry updated
- [x] Migration verified in db:studio

### Environment Setup

- [ ] Backend dev server running
- [ ] Email credentials configured
- [ ] Redis available (for queue integration)

### File Structure Verification

```bash
# Verify Phase 1 files exist
ls src/features/notifications/shared/
# Should see: 
# - notifications.schema.ts
# - notification-templates.schema.ts
# - notification-preferences.schema.ts
# - notification-delivery-logs.schema.ts
# - types.ts
# - constants.ts
# - index.ts
```

---

## Step-by-Step Implementation

### Step 1: Implement Template Service

**Duration**: 1 hour

The Template Service handles template rendering with variable substitution.

#### 1.1 Create Template Service

Create: `src/features/notifications/services/template.service.ts`

```typescript
import { eq } from 'drizzle-orm';
import { db } from '../../../database';
import { notificationTemplates } from '../shared/notification-templates.schema';
import { logger } from '../../../utils';
import type { RenderTemplateResult } from '../shared/types';

class TemplateService {
  /**
   * Render notification template with variables
   * 
   * @param templateCode - Unique template code (e.g., 'ORDER_CREATED')
   * @param variables - Object containing variable values
   * @returns Rendered template for all channels
   */
  async renderTemplate(
    templateCode: string,
    variables: Record<string, any>
  ): Promise<RenderTemplateResult> {
    try {
      // Fetch template from database
      const [template] = await db
        .select()
        .from(notificationTemplates)
        .where(eq(notificationTemplates.code, templateCode))
        .limit(1);

      if (!template) {
        throw new Error(`Template not found: ${templateCode}`);
      }

      if (!template.is_active) {
        throw new Error(`Template is inactive: ${templateCode}`);
      }

      // Render each template field with variable substitution
      return {
        type: templateCode,
        title: this.replaceVariables(template.in_app_title || '', variables),
        message: this.replaceVariables(template.in_app_message || '', variables),
        emailSubject: template.subject
          ? this.replaceVariables(template.subject, variables)
          : undefined,
        emailHtml: template.body_html
          ? this.replaceVariables(template.body_html, variables)
          : undefined,
        emailText: template.body_text
          ? this.replaceVariables(template.body_text, variables)
          : undefined,
        smsMessage: template.sms_template
          ? this.replaceVariables(template.sms_template, variables)
          : undefined,
      };
    } catch (error) {
      logger.error('Failed to render template', { 
        templateCode, 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  /**
   * Replace {{variable}} placeholders with actual values
   * Supports nested object access via dot notation
   * 
   * @param template - Template string with {{placeholders}}
   * @param variables - Object containing values
   * @returns Rendered string
   */
  private replaceVariables(
    template: string, 
    variables: Record<string, any>
  ): string {
    return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, key) => {
      // Support dot notation for nested objects
      const value = key.split('.').reduce((obj: any, k: string) => {
        return obj?.[k];
      }, variables);
      
      return value !== undefined && value !== null ? String(value) : match;
    });
  }

  /**
   * Get all templates (admin use)
   */
  async getAllTemplates(filters?: {
    category?: string;
    isActive?: boolean;
  }) {
    const conditions = [];

    if (filters?.category) {
      conditions.push(eq(notificationTemplates.category, filters.category));
    }

    if (filters?.isActive !== undefined) {
      conditions.push(eq(notificationTemplates.is_active, filters.isActive));
    }

    return await db
      .select()
      .from(notificationTemplates)
      .where(conditions.length > 0 ? conditions[0] : undefined);
  }

  /**
   * Get single template by code
   */
  async getTemplateByCode(code: string) {
    const [template] = await db
      .select()
      .from(notificationTemplates)
      .where(eq(notificationTemplates.code, code))
      .limit(1);

    return template || null;
  }

  /**
   * Create or update template (admin use)
   */
  async upsertTemplate(data: {
    code: string;
    name: string;
    description?: string;
    category?: string;
    subject?: string;
    body_text?: string;
    body_html?: string;
    sms_template?: string;
    in_app_title?: string;
    in_app_message?: string;
    variables?: string[];
    is_active?: boolean;
  }) {
    const [result] = await db
      .insert(notificationTemplates)
      .values({
        ...data,
        variables: data.variables || [],
      })
      .onConflictDoUpdate({
        target: notificationTemplates.code,
        set: {
          ...data,
          variables: data.variables || [],
          updated_at: new Date(),
        },
      })
      .returning();

    logger.info('Template upserted', { code: data.code });
    return result;
  }

  /**
   * Validate template variables
   * Checks if all required variables are provided
   */
  validateVariables(
    template: { variables: string[] | null },
    providedVariables: Record<string, any>
  ): { valid: boolean; missing: string[] } {
    const required = template.variables || [];
    const provided = Object.keys(providedVariables);
    const missing = required.filter(v => !provided.includes(v));

    return {
      valid: missing.length === 0,
      missing,
    };
  }
}

export const templateService = new TemplateService();
```

---

### Step 2: Implement Preference Service

**Duration**: 1 hour

The Preference Service manages user notification preferences.

#### 2.1 Create Preference Service

Create: `src/features/notifications/services/preference.service.ts`

```typescript
import { eq, and } from 'drizzle-orm';
import { db } from '../../../database';
import { notificationPreferences } from '../shared/notification-preferences.schema';
import { logger } from '../../../utils';
import type { NotificationType } from '../shared/notifications.schema';

class PreferenceService {
  /**
   * Get user preferences for a specific notification type
   * Returns default preferences if none exist
   */
  async getUserPreferences(
    userId: string,
    notificationType: string
  ) {
    const [preference] = await db
      .select()
      .from(notificationPreferences)
      .where(
        and(
          eq(notificationPreferences.user_id, userId),
          eq(notificationPreferences.notification_type, notificationType as any)
        )
      )
      .limit(1);

    // Return default preferences if none exist
    if (!preference) {
      return this.getDefaultPreferences();
    }

    return preference;
  }

  /**
   * Get all preferences for a user
   */
  async getAllUserPreferences(userId: string) {
    return await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.user_id, userId));
  }

  /**
   * Update user preference for a notification type
   */
  async updatePreference(
    userId: string,
    notificationType: string,
    settings: {
      channel_email?: boolean;
      channel_sms?: boolean;
      channel_in_app?: boolean;
      channel_push?: boolean;
      frequency?: 'immediate' | 'daily_digest' | 'weekly_digest' | 'never';
      quiet_hours_enabled?: boolean;
      quiet_hours_start?: string;
      quiet_hours_end?: string;
    }
  ) {
    const [result] = await db
      .insert(notificationPreferences)
      .values({
        user_id: userId,
        notification_type: notificationType as any,
        ...settings,
      })
      .onConflictDoUpdate({
        target: [
          notificationPreferences.user_id,
          notificationPreferences.notification_type,
        ],
        set: {
          ...settings,
          updated_at: new Date(),
        },
      })
      .returning();

    logger.info('Notification preference updated', { 
      userId, 
      notificationType 
    });

    return result;
  }

  /**
   * Initialize default preferences for a new user
   */
  async initializeUserPreferences(userId: string) {
    const notificationTypes: NotificationType[] = [
      'order_created',
      'order_shipped',
      'order_delivered',
      'payment_captured',
      'user_welcome',
    ];

    const defaultSettings = this.getDefaultPreferences();

    const insertPromises = notificationTypes.map(type =>
      db
        .insert(notificationPreferences)
        .values({
          user_id: userId,
          notification_type: type,
          ...defaultSettings,
        })
        .onConflictDoNothing()
    );

    await Promise.all(insertPromises);

    logger.info('User notification preferences initialized', { userId });
  }

  /**
   * Get default notification preferences
   */
  private getDefaultPreferences() {
    return {
      channel_email: true,
      channel_sms: false,
      channel_in_app: true,
      channel_push: true,
      frequency: 'immediate' as const,
      quiet_hours_enabled: false,
      quiet_hours_start: null,
      quiet_hours_end: null,
    };
  }

  /**
   * Check if a notification should be sent based on quiet hours
   */
  isWithinQuietHours(preference: any): boolean {
    if (!preference.quiet_hours_enabled) {
      return false;
    }

    if (!preference.quiet_hours_start || !preference.quiet_hours_end) {
      return false;
    }

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const start = preference.quiet_hours_start;
    const end = preference.quiet_hours_end;

    // Handle overnight quiet hours (e.g., 22:00 to 08:00)
    if (start > end) {
      return currentTime >= start || currentTime <= end;
    }

    return currentTime >= start && currentTime <= end;
  }

  /**
   * Determine which channels should be used based on preferences
   */
  getActiveChannels(preference: any): string[] {
    const channels: string[] = [];

    if (preference.channel_in_app) channels.push('in_app');
    if (preference.channel_email) channels.push('email');
    if (preference.channel_sms) channels.push('sms');
    if (preference.channel_push) channels.push('push');

    return channels;
  }
}

export const preferenceService = new PreferenceService();
```

---

### Step 3: Implement Delivery Service

**Duration**: 1.5 hours

The Delivery Service handles multi-channel notification delivery.

#### 3.1 Create Delivery Service

Create: `src/features/notifications/services/delivery.service.ts`

```typescript
import nodemailer from 'nodemailer';
import { db } from '../../../database';
import { notificationDeliveryLogs } from '../shared/notification-delivery-logs.schema';
import { users } from '../../user';
import { logger } from '../../../utils';
import { config } from '../../../utils/validateEnv';
import { eq } from 'drizzle-orm';

class DeliveryService {
  private emailTransporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initializeEmailTransporter();
  }

  private initializeEmailTransporter() {
    try {
      if (config.EMAIL_SERVICE && config.EMAIL_USER && config.EMAIL_PASSWORD) {
        this.emailTransporter = nodemailer.createTransporter({
          service: config.EMAIL_SERVICE,
          auth: {
            user: config.EMAIL_USER,
            pass: config.EMAIL_PASSWORD,
          },
        });
        logger.info('Email transporter initialized');
      } else {
        logger.warn('Email configuration missing - email delivery disabled');
      }
    } catch (error) {
      logger.error('Failed to initialize email transporter', { error });
    }
  }

  /**
   * Deliver notification across multiple channels
   */
  async deliverNotification(
    notificationId: string,
    userId: string,
    channels: string[],
    content: {
      title: string;
      message: string;
      emailSubject?: string;
      emailHtml?: string;
      emailText?: string;
      smsMessage?: string;
    }
  ): Promise<void> {
    // Get user details
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      logger.error('User not found for notification delivery', { userId });
      return;
    }

    // Deliver to each requested channel
    const deliveryPromises = channels.map(async (channel) => {
      switch (channel) {
        case 'email':
          if (user.email) {
            return this.sendEmail(notificationId, user.email, content);
          }
          break;
        case 'sms':
          if (user.phone) {
            return this.sendSMS(notificationId, user.phone, content);
          }
          break;
        case 'push':
          return this.sendPush(notificationId, userId, content);
        case 'in_app':
          // In-app notifications are already stored in DB
          return Promise.resolve();
        default:
          logger.warn('Unknown notification channel', { channel });
      }
    });

    await Promise.allSettled(deliveryPromises);
  }

  /**
   * Send email notification
   */
  private async sendEmail(
    notificationId: string,
    email: string,
    content: {
      emailSubject?: string;
      emailHtml?: string;
      emailText?: string;
      title: string;
      message: string;
    }
  ): Promise<void> {
    if (!this.emailTransporter) {
      logger.warn('Email transporter not available');
      await this.logDelivery({
        notification_id: notificationId,
        channel: 'email',
        status: 'failed',
        recipient: email,
        error_message: 'Email transporter not configured',
        failed_at: new Date(),
      });
      return;
    }

    try {
      const mailOptions = {
        from: config.EMAIL_FROM || config.EMAIL_USER,
        to: email,
        subject: content.emailSubject || content.title,
        text: content.emailText || content.message,
        html: content.emailHtml || `<p>${content.message}</p>`,
      };

      const info = await this.emailTransporter.sendMail(mailOptions);

      await this.logDelivery({
        notification_id: notificationId,
        channel: 'email',
        status: 'sent',
        recipient: email,
        provider: 'nodemailer',
        provider_message_id: info.messageId,
        provider_response: info,
        sent_at: new Date(),
      });

      logger.info('Email sent successfully', { 
        notificationId, 
        to: email,
        messageId: info.messageId 
      });
    } catch (error) {
      logger.error('Email delivery failed', { notificationId, email, error });

      await this.logDelivery({
        notification_id: notificationId,
        channel: 'email',
        status: 'failed',
        recipient: email,
        provider: 'nodemailer',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        failed_at: new Date(),
      });
    }
  }

  /**
   * Send SMS notification (placeholder for SMS provider integration)
   */
  private async sendSMS(
    notificationId: string,
    phone: string,
    content: { smsMessage?: string; message: string }
  ): Promise<void> {
    // TODO: Integrate with SMS provider (Twilio, AWS SNS, etc.)
    logger.info('SMS sending placeholder', {
      notificationId,
      phone,
      message: content.smsMessage || content.message,
    });

    await this.logDelivery({
      notification_id: notificationId,
      channel: 'sms',
      status: 'pending',
      recipient: phone,
      provider: 'placeholder',
      sent_at: new Date(),
    });
  }

  /**
   * Send push notification (placeholder for push service integration)
   */
  private async sendPush(
    notificationId: string,
    userId: string,
    content: { title: string; message: string }
  ): Promise<void> {
    // TODO: Integrate with push notification service (Firebase, OneSignal, etc.)
    logger.info('Push notification placeholder', {
      notificationId,
      userId,
      title: content.title,
    });

    await this.logDelivery({
      notification_id: notificationId,
      channel: 'push',
      status: 'pending',
      provider: 'placeholder',
      sent_at: new Date(),
    });
  }

  /**
   * Log delivery attempt to database
   */
  private async logDelivery(data: {
    notification_id: string;
    channel: string;
    status: 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced';
    recipient?: string;
    provider?: string;
    provider_message_id?: string;
    provider_response?: any;
    error_message?: string;
    error_code?: string;
    sent_at?: Date;
    delivered_at?: Date;
    failed_at?: Date;
  }): Promise<void> {
    try {
      await db.insert(notificationDeliveryLogs).values(data);
    } catch (error) {
      logger.error('Failed to log notification delivery', { error, data });
    }
  }
}

export const deliveryService = new DeliveryService();
```

---

### Step 4: Implement Notification Service

**Duration**: 2 hours

The main Notification Service orchestrates all notification operations.

[Continue with NotificationService implementation, User APIs, Admin APIs, Route setup, and Testing sections...]

---

## Testing & Validation

### Unit Tests

Create: `src/features/notifications/tests/template.service.test.ts`

```typescript
import { templateService } from '../services/template.service';

describe('TemplateService', () => {
  it('should replace variables correctly', async () => {
    const result = await templateService.renderTemplate('ORDER_CREATED', {
      userName: 'John Doe',
      orderNumber: 'ORD-12345',
      total: '1299.00',
      currency: 'INR',
    });

    expect(result.title).toContain('John Doe');
    expect(result.message).toContain('ORD-12345');
  });

  it('should handle missing variables gracefully', async () => {
    const result = await templateService.renderTemplate('ORDER_CREATED', {
      userName: 'Jane',
    });

    expect(result.title).toBeDefined();
    // Should keep placeholders for missing variables
    expect(result.message).toContain('{{orderNumber}}');
  });
});
```

---

## Next Steps

After completing Phase 2:

1. **Phase 3**: Real-time delivery (WebSocket/SSE)
2. **Phase 4**: Admin dashboard UI
3. **Phase 5**: User notification center UI
4. **Phase 6**: Advanced features (scheduling, batching, A/B testing)

---

**Phase 2 Ready to Implement!** 🚀

Services → APIs → Testing → Integration
