# Event Integration Examples for Notification System

This document provides code examples for integrating notification triggers into your existing business logic.

## Order Events

### 1. Order Created

**Location**: `src/features/orders/apis/create-order.ts`

**Add after order creation (around line 250)**:

```typescript
// Import at top of file
import { eventPublisher } from '../../queue/services/event-publisher.service';

// After order creation, add this:
await eventPublisher.publishNotification({
    userId: userId!,
    templateCode: 'ORDER_CREATED',
    variables: {
        userName: user?.full_name || 'Customer',
        orderNumber: order.order_number,
        total: Number(order.total_amount),
        currency: 'INR',
        itemCount: items.length,
        orderUrl: `${process.env.FRONTEND_URL || ''}/profile/orders/${order.id}`,
    },
    options: {
        priority: 'high',
        actionUrl: `/profile/orders/${order.id}`,
        actionText: 'View Order',
    },
});
```

### 2. Order Shipped

**Location**: `src/features/orders/apis/update-order-status.ts`

**Add when status changes to 'shipped'**:

```typescript
// In the status update logic
if (newStatus === 'shipped') {
    await eventPublisher.publishNotification({
        userId: order.user_id,
        templateCode: 'ORDER_SHIPPED',
        variables: {
            userName: user?.full_name || 'Customer',
            orderNumber: order.order_number,
            trackingNumber: order.tracking_number || 'Not available',
            orderUrl: `${process.env.FRONTEND_URL || ''}/profile/orders/${order.id}`,
        },
        options: {
            priority: 'normal',
            actionUrl: `/profile/orders/${order.id}`,
            actionText: 'Track Order',
        },
    });
}
```

### 3. Order Delivered

**Add when status changes to 'delivered'**:

```typescript
if (newStatus === 'delivered') {
    await eventPublisher.publishNotification({
        userId: order.user_id,
        templateCode: 'ORDER_DELIVERED',
        variables: {
            userName: user?.full_name || 'Customer',
            orderNumber: order.order_number,
            orderUrl: `${process.env.FRONTEND_URL || ''}/profile/orders/${order.id}`,
        },
        options: {
            priority: 'normal',
            actionUrl: `/profile/orders/${order.id}`,
            actionText: 'View Order',
        },
    });
}
```

## Payment Events

### 1. Payment Captured

**Location**: `src/features/payments/apis/*` (payment capture endpoint)

**Add after successful payment**:

```typescript
await eventPublisher.publishNotification({
    userId: payment.user_id,
    templateCode: 'PAYMENT_CAPTURED',
    variables: {
        userName: user?.full_name || 'Customer',
        amount: payment.amount,
        currency: payment.currency,
        paymentId: payment.razorpay_payment_id,
        orderNumber: order?.order_number || 'N/A',
    },
    options: {
        priority: 'high',
    },
});
```

### 2. Payment Failed

**Add when payment fails**:

```typescript
await eventPublisher.publishNotification({
    userId: userId,
    templateCode: 'PAYMENT_FAILED',
    variables: {
        userName: user?.full_name || 'Customer',
        amount: amount,
        currency: 'INR',
        errorMessage: error.message || 'Payment could not be processed',
    },
    options: {
        priority: 'high',
    },
});
```

## Inventory Events

### Low Stock Alert

**Location**: `src/features/inventory/services/*` (inventory update logic)

**Add when stock falls below threshold**:

```typescript
// Get admin users function (create this helper)
async function getAdminUserIds(): Promise<string[]> {
    const { users } = await import('../../user/shared/user.schema');
    const { eq } = await import('drizzle-orm');
    
    const admins = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.role, 'admin'));
    
    return admins.map(a => a.id);
}

// In inventory update logic
if (newQuantity <= lowStockThreshold && newQuantity > 0) {
    const adminIds = await getAdminUserIds();
    
    if (adminIds.length > 0) {
        await eventPublisher.publishBatchNotification({
            userIds: adminIds,
            templateCode: 'LOW_STOCK_ALERT',
            variables: {
                productName: product.name,
                currentStock: newQuantity,
                threshold: lowStockThreshold,
                productUrl: `${process.env.ADMIN_URL || ''}/inventory/${product.id}`,
            },
            options: {
                priority: 'urgent',
            },
        });
    }
}
```

## User Registration Welcome Email

**Location**: `src/features/auth/apis/signup.ts`

**Add after successful registration**:

```typescript
await eventPublisher.publishNotification({
    userId: newUser.id,
    templateCode: 'USER_WELCOME',
    variables: {
        userName: newUser.full_name,
        email: newUser.email,
    },
    options: {
        priority: 'normal',
        delay: 5000, // Send after 5 seconds
    },
});
```

## Testing the Integration

### 1. Create an Order

```bash
# Start server
npm run dev

# Create order via API
curl -X POST http://localhost:5000/api/orders \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "shipping_address_id": "...",
    "payment_method": "cod"
  }'

# Check notifications
curl http://localhost:5000/api/notifications \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Check Queue Dashboard

If you have Bull Board installed, visit:
```
http://localhost:5000/admin/queues
```

### 3. Check Worker Logs

Watch the console for:
```
[NotificationWorker] Processing send-notification job
[NotificationService] Notification created successfully
```

## Environment Variables Needed

Add to `.env.dev`:

```env
# Notification URLs
FRONTEND_URL=http://localhost:3000
ADMIN_URL=http://localhost:3000/admin

# Email configuration (already configured)
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@yourcompany.com
```

## Next Steps

1. ✅ Queue infrastructure set up
2. ✅ Notification worker extended
3. ✅ Event publisher enhanced
4. ⏳ **Integrate into business logic** (use examples above)
5. ⏳ Test each integration
6. ⏳ Seed notification templates
7. ⏳ Deploy to production

## Monitoring

### Check Job Status

```typescript
// In any file
import { notificationQueue } from './features/queue/jobs/notification.job';

const queue = await notificationQueue.getQueue();
const jobCounts = await queue.getJobCounts();
console.log('Notification jobs:', jobCounts);
```

### View Failed Jobs

```typescript
const failed = await queue.getFailed();
failed.forEach(job => {
  console.log('Failed job:', job.id, job.failedReason);
});
```

---

**Phase 3 Implementation Complete!** 🎉

The notification system is now event-driven and ready for integration into your business logic.
