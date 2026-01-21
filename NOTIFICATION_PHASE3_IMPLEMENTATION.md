# Notification System - Phase 3 Implementation Plan

> **Document Version**: 1.0  
> **Last Updated**: January 20, 2026  
> **Phase**: Queue Integration & Event-Driven Notifications  
> **Estimated Time**: 4-6 hours  
> **Prerequisites**: Phase 1 & Phase 2 Complete ✅

---

## Table of Contents

1. [Phase 3 Overview](#phase-3-overview)
2. [Prerequisites Checklist](#prerequisites-checklist)
3. [Architecture Overview](#architecture-overview)
4. [Step-by-Step Implementation](#step-by-step-implementation)
5. [Testing & Validation](#testing--validation)
6. [Troubleshooting](#troubleshooting)
7. [Next Steps](#next-steps)

---

## Phase 3 Overview

### Objectives

Phase 3 integrates the notification system with your existing BullMQ queue infrastructure to create a fully **event-driven notification system**:

✅ Create notification queue jobs  
✅ Integrate with existing event publisher  
✅ Hook into business events (orders, payments, inventory)  
✅ Implement notification queue worker  
✅ Add batch notification processing  
✅ Handle failed deliveries with retry logic  
✅ Add notification scheduling support  

### What We'll Build

```
Phase 3 Deliverables:
├── Queue Jobs (3)
│   ├── notification.job.ts - Individual notification job
│   ├── batch-notification.job.ts - Batch processing
│   └── scheduled-notification.job.ts - Delayed delivery
│
├── Queue Worker
│   └── notification.worker.ts - Process notification jobs
│
├── Event Integration (6 events)
│   ├── ORDER_CREATED → Order confirmation
│   ├── ORDER_SHIPPED → Shipping notification
│   ├── ORDER_DELIVERED → Delivery notification
│   ├── PAYMENT_CAPTURED → Payment success
│   ├── PAYMENT_FAILED → Payment failure
│   └── INVENTORY_LOW_STOCK → Low stock alert
│
├── Enhanced Services
│   ├── Queue service integration
│   ├── Retry logic for failed deliveries
│   └── Batch processing support
│
└── Event Handlers
    └── Hook into existing business logic
```

### Timeline

| Task | Duration | Dependencies |
|------|----------|--------------|
| Create notification queue jobs | 1 hour | Phase 2 services |
| Implement queue worker | 1.5 hours | Queue jobs |
| Integrate event publisher | 1 hour | Worker |
| Hook into business events | 1.5 hours | Event publisher |
| Add retry & error handling | 1 hour | All above |
| Testing & validation | 1 hour | All above |

**Total: ~6 hours**

---

## Prerequisites Checklist

Before starting Phase 3, verify:

### Phase 1 & 2 Completion

- [x] Database tables created
- [x] All services implemented
- [x] API endpoints functional
- [x] Route integrated into server

### Existing Infrastructure

- [ ] BullMQ queue system running
- [ ] Redis connection active
- [ ] Event publisher service available
- [ ] Queue workers enabled in config

### Verification Commands

```bash
# Check if Redis is running
redis-cli ping
# Should return: PONG

# Check queue workers config
grep QUEUE_WORKERS_ENABLED .env.dev
# Should return: QUEUE_WORKERS_ENABLED=true

# Verify queue infrastructure exists
ls src/features/queue/
# Should see: services/, workers/, etc.
```

---

## Architecture Overview

### Event Flow

```
Business Event → Event Publisher → BullMQ Queue → Notification Worker → Notification Service → Delivery
```

### Detailed Flow

1. **Business Event Occurs**
   - Order created in database
   - Event published to queue: `{ type: 'ORDER_CREATED', data: {...} }`

2. **Event Publisher**
   - Receives event
   - Publishes to `notification` queue
   - Job added to BullMQ

3. **Queue Worker**
   - Picks up job from queue
   - Calls notification service
   - Handles retries on failure

4. **Notification Service**
   - Creates notification from template
   - Checks user preferences
   - Stores in database
   - Triggers delivery

5. **Delivery Service**
   - Sends via active channels
   - Logs delivery attempts
   - Returns success/failure

### Queue Structure

```
notification-queue (BullMQ)
├── Jobs
│   ├── send-notification (individual)
│   ├── batch-notifications (bulk)
│   └── scheduled-notification (delayed)
│
├── Worker
│   └── Process jobs concurrently
│
└── Failed Queue
    └── Retry with backoff
```

---

## Step-by-Step Implementation

### Step 1: Create Notification Queue Jobs

**Duration**: 1 hour

#### 1.1 Create Send Notification Job

Create: `src/features/queue/jobs/notification.job.ts`

```typescript
import { Queue } from 'bullmq';
import { logger } from '../../../utils';
import { getRedisConnection } from '../services/queue.service';

export interface SendNotificationJobData {
  userId: string;
  templateCode: string;
  variables: Record<string, any>;
  options?: {
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    actionUrl?: string;
    actionText?: string;
    delay?: number; // milliseconds
  };
}

class NotificationQueue {
  private queue: Queue<SendNotificationJobData> | null = null;

  async getQueue(): Promise<Queue<SendNotificationJobData>> {
    if (!this.queue) {
      const connection = await getRedisConnection();
      this.queue = new Queue<SendNotificationJobData>('notifications', {
        connection,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000, // 2s, 4s, 8s
          },
          removeOnComplete: {
            age: 24 * 3600, // Keep for 24 hours
            count: 1000, // Keep last 1000
          },
          removeOnFail: {
            age: 7 * 24 * 3600, // Keep failures for 7 days
          },
        },
      });

      logger.info('Notification queue initialized');
    }

    return this.queue;
  }

  /**
   * Send a notification via queue
   */
  async sendNotification(data: SendNotificationJobData): Promise<void> {
    const queue = await this.getQueue();

    const jobOptions: any = {
      priority: this.getPriority(data.options?.priority),
    };

    if (data.options?.delay) {
      jobOptions.delay = data.options.delay;
    }

    await queue.add('send-notification', data, jobOptions);

    logger.info('Notification job queued', {
      userId: data.userId,
      templateCode: data.templateCode,
      delay: data.options?.delay,
    });
  }

  /**
   * Convert priority to BullMQ priority (lower number = higher priority)
   */
  private getPriority(priority?: string): number {
    switch (priority) {
      case 'urgent':
        return 1;
      case 'high':
        return 2;
      case 'normal':
        return 3;
      case 'low':
        return 4;
      default:
        return 3;
    }
  }

  /**
   * Close queue connection
   */
  async close(): Promise<void> {
    if (this.queue) {
      await this.queue.close();
      logger.info('Notification queue closed');
    }
  }
}

export const notificationQueue = new NotificationQueue();
```

#### 1.2 Create Batch Notification Job

Create: `src/features/queue/jobs/batch-notification.job.ts`

```typescript
import { Queue } from 'bullmq';
import { logger } from '../../../utils';
import { getRedisConnection } from '../services/queue.service';

export interface BatchNotificationJobData {
  userIds: string[];
  templateCode: string;
  variables: Record<string, any>; // Same variables for all users
  options?: {
    priority?: 'low' | 'normal' | 'high' | 'urgent';
  };
}

class BatchNotificationQueue {
  private queue: Queue<BatchNotificationJobData> | null = null;

  async getQueue(): Promise<Queue<BatchNotificationJobData>> {
    if (!this.queue) {
      const connection = await getRedisConnection();
      this.queue = new Queue<BatchNotificationJobData>('batch-notifications', {
        connection,
        defaultJobOptions: {
          attempts: 2,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
        },
      });

      logger.info('Batch notification queue initialized');
    }

    return this.queue;
  }

  /**
   * Send batch notifications
   */
  async sendBatchNotification(data: BatchNotificationJobData): Promise<void> {
    const queue = await this.getQueue();

    await queue.add('batch-notification', data, {
      priority: data.options?.priority === 'urgent' ? 1 : 3,
    });

    logger.info('Batch notification job queued', {
      userCount: data.userIds.length,
      templateCode: data.templateCode,
    });
  }

  async close(): Promise<void> {
    if (this.queue) {
      await this.queue.close();
    }
  }
}

export const batchNotificationQueue = new BatchNotificationQueue();
```

---

### Step 2: Create Queue Worker

**Duration**: 1.5 hours

#### 2.1 Implement Notification Worker

Create: `src/features/queue/workers/notification.worker.ts`

```typescript
import { Worker, Job } from 'bullmq';
import { logger } from '../../../utils';
import { getRedisConnection } from '../services/queue.service';
import { notificationService } from '../../notifications/services';
import type { SendNotificationJobData } from '../jobs/notification.job';
import type { BatchNotificationJobData } from '../jobs/batch-notification.job';

class NotificationWorker {
  private worker: Worker | null = null;
  private batchWorker: Worker | null = null;

  /**
   * Start the notification worker
   */
  async start(): Promise<void> {
    const connection = await getRedisConnection();

    // Individual notification worker
    this.worker = new Worker<SendNotificationJobData>(
      'notifications',
      async (job: Job<SendNotificationJobData>) => {
        return await this.processNotification(job);
      },
      {
        connection,
        concurrency: 10, // Process 10 notifications concurrently
        limiter: {
          max: 100, // Max 100 jobs
          duration: 1000, // Per second
        },
      }
    );

    // Batch notification worker
    this.batchWorker = new Worker<BatchNotificationJobData>(
      'batch-notifications',
      async (job: Job<BatchNotificationJobData>) => {
        return await this.processBatchNotification(job);
      },
      {
        connection,
        concurrency: 5, // Process 5 batches concurrently
      }
    );

    this.setupEventListeners();

    logger.info('Notification workers started', {
      concurrency: 10,
      batchConcurrency: 5,
    });
  }

  /**
   * Process individual notification job
   */
  private async processNotification(
    job: Job<SendNotificationJobData>
  ): Promise<void> {
    const { userId, templateCode, variables, options } = job.data;

    logger.info('Processing notification job', {
      jobId: job.id,
      userId,
      templateCode,
      attempt: job.attemptsMade + 1,
    });

    try {
      const notification = await notificationService.createFromTemplate(
        userId,
        templateCode,
        variables,
        options
      );

      if (!notification) {
        logger.warn('Notification not created (probably filtered by preferences)', {
          jobId: job.id,
          userId,
          templateCode,
        });
        return;
      }

      logger.info('Notification processed successfully', {
        jobId: job.id,
        notificationId: notification.id,
      });
    } catch (error) {
      logger.error('Failed to process notification job', {
        jobId: job.id,
        userId,
        templateCode,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error; // Re-throw to trigger retry
    }
  }

  /**
   * Process batch notification job
   */
  private async processBatchNotification(
    job: Job<BatchNotificationJobData>
  ): Promise<void> {
    const { userIds, templateCode, variables } = job.data;

    logger.info('Processing batch notification job', {
      jobId: job.id,
      userCount: userIds.length,
      templateCode,
    });

    // Process in chunks of 50 to avoid overwhelming the system
    const chunkSize = 50;
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < userIds.length; i += chunkSize) {
      const chunk = userIds.slice(i, i + chunkSize);

      const results = await Promise.allSettled(
        chunk.map(userId =>
          notificationService.createFromTemplate(userId, templateCode, variables)
        )
      );

      results.forEach(result => {
        if (result.status === 'fulfilled') {
          successCount++;
        } else {
          failCount++;
        }
      });
    }

    logger.info('Batch notification processed', {
      jobId: job.id,
      total: userIds.length,
      success: successCount,
      failed: failCount,
    });
  }

  /**
   * Setup event listeners for monitoring
   */
  private setupEventListeners(): void {
    if (this.worker) {
      this.worker.on('completed', job => {
        logger.debug('Notification job completed', { jobId: job.id });
      });

      this.worker.on('failed', (job, error) => {
        logger.error('Notification job failed', {
          jobId: job?.id,
          attempts: job?.attemptsMade,
          error: error.message,
        });
      });
    }

    if (this.batchWorker) {
      this.batchWorker.on('completed', job => {
        logger.info('Batch notification job completed', { jobId: job.id });
      });

      this.batchWorker.on('failed', (job, error) => {
        logger.error('Batch notification job failed', {
          jobId: job?.id,
          error: error.message,
        });
      });
    }
  }

  /**
   * Stop the workers
   */
  async stop(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
      logger.info('Notification worker stopped');
    }

    if (this.batchWorker) {
      await this.batchWorker.close();
      logger.info('Batch notification worker stopped');
    }
  }
}

export const notificationWorker = new NotificationWorker();
```

---

### Step 3: Integrate with Event Publisher

**Duration**: 1 hour

#### 3.1 Add Notification Event Methods to Event Publisher

Update: `src/features/queue/services/event-publisher.service.ts`

Add these methods to the `EventPublisher` class:

```typescript
/**
 * Publish notification event
 */
async publishNotification(data: {
  userId: string;
  templateCode: string;
  variables: Record<string, any>;
  options?: {
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    actionUrl?: string;
    actionText?: string;
    delay?: number;
  };
}): Promise<void> {
  const { notificationQueue } = await import('../jobs/notification.job');
  await notificationQueue.sendNotification(data);
}

/**
 * Publish batch notification event
 */
async publishBatchNotification(data: {
  userIds: string[];
  templateCode: string;
  variables: Record<string, any>;
  options?: {
    priority?: 'low' | 'normal' | 'high' | 'urgent';
  };
}): Promise<void> {
  const { batchNotificationQueue } = await import('../jobs/batch-notification.job');
  await batchNotificationQueue.sendBatchNotification(data);
}
```

---

### Step 4: Hook into Business Events

**Duration**: 1.5 hours

Now we'll integrate notification triggers into existing business logic.

#### 4.1 Orders - Add Notification Triggers

Update order creation/update endpoints to publish notification events.

Example for **Order Created**:

In `src/features/orders/apis/create-order.ts` (or wherever orders are created):

```typescript
// After order is successfully created
await eventPublisher.publishNotification({
  userId: order.user_id,
  templateCode: 'ORDER_CREATED',
  variables: {
    userName: user.full_name,
    orderNumber: order.order_number,
    total: order.total_amount,
    currency: 'INR',
    orderUrl: `${process.env.FRONTEND_URL}/profile/orders/${order.id}`,
    itemCount: orderItems.length,
  },
  options: {
    priority: 'high',
    actionUrl: `/profile/orders/${order.id}`,
    actionText: 'View Order',
  },
});
```

Example for **Order Shipped**:

In the order status update logic:

```typescript
if (newStatus === 'shipped') {
  await eventPublisher.publishNotification({
    userId: order.user_id,
    templateCode: 'ORDER_SHIPPED',
    variables: {
      userName: user.full_name,
      orderNumber: order.order_number,
      trackingNumber: order.tracking_number,
      orderUrl: `${process.env.FRONTEND_URL}/profile/orders/${order.id}`,
    },
    options: {
      priority: 'normal',
      actionUrl: `/profile/orders/${order.id}`,
      actionText: 'Track Order',
    },
  });
}
```

#### 4.2 Payments - Add Notification Triggers

In `src/features/payments` after payment capture:

```typescript
// After successful payment capture
await eventPublisher.publishNotification({
  userId: payment.user_id,
  templateCode: 'PAYMENT_CAPTURED',
  variables: {
    userName: user.full_name,
    amount: payment.amount,
    currency: payment.currency,
    paymentId: payment.razorpay_payment_id,
    orderNumber: order.order_number,
  },
  options: {
    priority: 'high',
  },
});
```

#### 4.3 Inventory - Add Low Stock Alerts

In inventory update logic:

```typescript
// After inventory update, check stock levels
if (newQuantity <= lowStockThreshold && newQuantity > 0) {
  // Get admin users
  const admins = await getAdminUsers(); // Implement this function
  
  await eventPublisher.publishBatchNotification({
    userIds: admins.map(a => a.id),
    templateCode: 'LOW_STOCK_ALERT',
    variables: {
      productName: product.name,
      currentStock: newQuantity,
      threshold: lowStockThreshold,
      productUrl: `${process.env.ADMIN_URL}/inventory/${product.id}`,
    },
    options: {
      priority: 'urgent',
    },
  });
}
```

---

### Step 5: Register Worker in Server

**Duration**: 15 minutes

#### 5.1 Update Worker Initialization

Update: `src/features/queue/index.ts`

```typescript
import { notificationWorker } from './workers/notification.worker';

export async function startWorkers() {
  logger.info('Starting BullMQ workers...');
  
  // ... existing workers ...
  
  // Start notification worker
  await notificationWorker.start();
  
  logger.info('All workers started successfully');
}

export async function stopWorkers() {
  logger.info('Stopping BullMQ workers...');
  
  // ... existing worker stops ...
  
  // Stop notification worker
  await notificationWorker.stop();
  
  logger.info('All workers stopped');
}
```

---

## Testing & Validation

### Manual Testing

#### Test 1: Create Order & Verify Notification

```bash
# 1. Start the server
npm run dev

# 2. Create an order via API
curl -X POST http://localhost:5000/api/orders \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [...],
    "shipping_address": {...}
  }'

# 3. Check notifications
curl http://localhost:5000/api/notifications/unread-count \
  -H "Authorization: Bearer YOUR_TOKEN"

# 4. View notification
curl http://localhost:5000/api/notifications \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Test 2: Check Queue Dashboard

Access BullMQ dashboard (if you have bull-board installed):
```
http://localhost:5000/admin/queues
```

### Automated Tests

Create: `src/features/notifications/tests/integration/queue.test.ts`

```typescript
import { notificationQueue } from '../../queue/jobs/notification.job';
import { notificationService } from '../services';

describe('Notification Queue Integration', () => {
  it('should queue and process notification', async () => {
    await notificationQueue.sendNotification({
      userId: 'test-user-id',
      templateCode: 'ORDER_CREATED',
      variables: {
        userName: 'Test User',
        orderNumber: 'TEST-123',
      },
    });

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify notification was created
    const notifications = await notificationService.getUserNotifications(
      'test-user-id',
      { limit: 1 }
    );

    expect(notifications).toHaveLength(1);
    expect(notifications[0].title).toContain('Test User');
  });
});
```

---

## Troubleshooting

### Issue: Jobs Not Being Processed

**Solution**:
1. Check if Redis is running: `redis-cli ping`
2. Verify workers are started: Check server logs for "Notification workers started"
3. Check queue: `redis-cli LLEN bull:notifications:wait`

### Issue: Notifications Not Appearing

**Solution**:
1. Check user preferences (might be disabled)
2. Check quiet hours settings
3. Verify template exists and is active
4. Check worker logs for errors

### Issue: High Memory Usage

**Solution**:
1. Reduce worker concurrency
2. Implement job result cleanup
3. Add rate limiting to job processing

---

## Next Steps

After completing Phase 3:

1. **Phase 4**: Real-time delivery (WebSocket/SSE)
2. **Phase 5**: Admin dashboard UI
3. **Phase 6**: User notification center UI
4. **Phase 7**: Advanced features (A/B testing, analytics)

---

**Phase 3 Ready to Implement!** 🚀

Queue Integration → Event Hooks → Testing → Production
