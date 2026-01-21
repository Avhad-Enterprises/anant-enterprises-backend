# Notifications Feature

> **Status**: Phase 1 Complete - Database Foundation  
> **Version**: 1.0  
> **Last Updated**: January 20, 2026

---

## Overview

The notifications feature provides a comprehensive notification system for both admin panel and customer-facing applications. It supports multi-channel delivery (in-app, email, SMS, push notifications) with user preferences and template management.

## Architecture

### Database Tables

1. **`notifications`** - Main notification storage
   - Stores all user notifications
   - Tracks read status and delivery channels
   - Supports rich data payloads (JSON)

2. **`notification_templates`** - Reusable message templates
   - Template-based notifications with variable substitution
   - Supports email (HTML & text), SMS, and in-app formats
   - Categorized and versioned

3. **`notification_preferences`** - User notification settings
   - Per-user, per-type preferences
   - Channel selection (email, SMS, in-app, push)
   - Delivery frequency (immediate, daily digest, weekly)
   - Quiet hours support

4. **`notification_delivery_logs`** - Delivery tracking
   - Tracks delivery attempts per channel
   - Provider-specific responses
   - Error tracking and retry counts

## Phase 1 Completion Status

### ✅ Completed

- [x] Database migration created (`0001_add_notification_system.sql`)
- [x] Feature module structure created
- [x] Schema definitions implemented (Drizzle ORM)
  - [x] `notifications.schema.ts`
  - [x] `notification-templates.schema.ts`
  - [x] `notification-preferences.schema.ts`
  - [x] `notification-delivery-logs.schema.ts`
- [x] Shared types and constants defined
- [x] Database registry updated (`drizzle.ts`)
- [x] Template seeding script created
- [x] Migration applied to database

### 📋 Pending (Phase 2)

- [ ] Core services implementation
  - [ ] NotificationService
  - [ ] TemplateService
  - [ ] PreferenceService
  - [ ] DeliveryService
- [ ] API endpoints
  - [ ] User endpoints (get, mark read, preferences)
  - [ ] Admin endpoints (broadcast, templates, stats)
- [ ] Queue worker integration
- [ ] Real-time delivery (WebSocket/SSE)

## Templates

### Pre-built Templates (6)

1. **ORDER_CREATED** - Order confirmation
2. **ORDER_SHIPPED** - Shipping notification
3. **ORDER_DELIVERED** - Delivery confirmation
4. **PAYMENT_CAPTURED** - Payment success
5. **LOW_STOCK_ALERT** - Inventory alerts for admins
6. **USER_WELCOME** - Welcome message for new users

### Template Variables

Templates support variable substitution using `{{variableName}}` syntax:

```typescript
// Example variables
{
  userName: "John Doe",
  orderNumber: "ORD-12345",
  total: "1299.00",
  currency: "INR",
  orderUrl: "https://example.com/orders/123"
}
```

## Database Schema

### Enums

```typescript
notification_type: 'order_created' | 'order_paid' | ...
notification_priority: 'low' | 'normal' | 'high' | 'urgent'
notification_frequency: 'immediate' | 'daily_digest' | 'weekly_digest' | 'never'
delivery_status: 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced'
```

### Key Indexes

- `idx_notifications_user_id` - Fast user notification queries
- `idx_notifications_user_id_is_read` - Unread count queries
- `idx_notifications_created_at` - Time-based sorting
- `idx_notification_templates_code` - Template lookup
- `idx_delivery_logs_notification_id` - Delivery tracking

## Usage

### Seeding Templates

```bash
# Seed notification templates
npm run db:seed:notifications

# View database in Drizzle Studio
npm run db:studio
```

### Migration

```bash
# Run migration
npm run db:migrate:dev

# Check migration status
npm run db:check
```

## Next Steps

1. Implement core services (NotificationService, TemplateService)
2. Create API endpoints
3. Integrate with existing queue workers
4. Add real-time notification support
5. Build admin dashboard features
6. Create user notification center UI

## Directory Structure

```
src/features/notifications/
├── shared/
│   ├── notifications.schema.ts
│   ├── notification-templates.schema.ts
│   ├── notification-preferences.schema.ts
│   ├── notification-delivery-logs.schema.ts
│   ├── types.ts
│   ├── constants.ts
│   └── index.ts
├── services/         # To be implemented
├── apis/             # To be implemented
└── tests/            # To be implemented
```

## Related Documentation

- [Notification System Implementation Guide](../../NOTIFICATION_SYSTEM_IMPLEMENTATION.md)
- [Phase 1 Implementation Plan](../../NOTIFICATION_PHASE1_IMPLEMENTATION.md)
- [Queue System Documentation](../queue/README.md)

---

**Phase 1 Complete** ✅  
Database foundation is ready for service implementation!
