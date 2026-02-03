# Queue System

This module implements a robust, background job processing system using **BullMQ** and **Redis**. It handles asynchronous tasks such as email notifications, order processing, inventory updates, and more.

## Architecture

The system follows a producer-consumer pattern:

1.  **Event Publisher (`EventPublisherService`)**:
    -   API endpoints call methods on the `eventPublisher` (e.g., `publishOrderCreated`).
    -   These methods wrap the data in a `QueueEvent` and add it to the appropriate Redis queue.

2.  **Queue Service (`QueueService`)**:
    -   Manages the lifecycle of BullMQ queues (creation, connection, pausing, clearing).
    -   Provides admin APIs for monitoring queue health.

3.  **Workers**:
    -   Dedicated workers run in the background (or separate process) to process jobs.
    -   Each worker handles a specific domain (e.g., `OrderWorker` handles `ORDER_*` events).

## Directory Structure

```
src/features/queue/
├── apis/               # Admin REST APIs for queue monitoring
├── jobs/               # Job definitions and specific queue wrappers
├── services/           # Core services
│   ├── workers/        # Worker implementations (OrderWorker, NotificationWorker)
│   ├── queue.service.ts
│   └── event-publisher.service.ts
├── shared/             # Shared types, config, constants
└── index.ts            # Public API exports
```

## Supported Events & Queues

### Queue: `orders`
| Event Type | Description |
| :--- | :--- |
| `ORDER_CREATED` | Triggered when a new order is placed. Sends confirmation email. |
| `ORDER_PAID` | Triggered when payment is confirmed. Updates status. |
| `ORDER_SHIPPED` | Triggered when fulfillment is completed. |
| `ORDER_CANCELLED` | Triggered when an order is cancelled. |

### Queue: `payments`
| Event Type | Description |
| :--- | :--- |
| `PAYMENT_AUTHORIZED` | Payment authorized via gateway. |
| `PAYMENT_REFUNDED` | Refund processed. |

### Queue: `inventory`
| Event Type | Description |
| :--- | :--- |
| `INVENTORY_RESERVED` | Deducts stock for new orders. |
| `INVENTORY_RELEASED` | Restores stock for cancelled orders. |
| `LOW_STOCK_ALERT` | Triggered when stock falls below threshold. |

### Queue: `notifications`
| Event Type | Description |
| :--- | :--- |
| `send-notification` | **[Primary]** Sends a templated notification via active channels (In-App, Email, etc). |
| `batch-notification` | Sends a notification to multiple users. |
| `SEND_EMAIL` | **[Legacy]** Raw email sending (use `send-notification` instead). |

## Environment Variables

Ensure these are set in your `.env`:

```bash
# Queue Configuration
QUEUE_WORKERS_ENABLED=true
QUEUE_CONCURRENCY=5

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

## Scaling

To scale workers independently from the API server:

1.  Set `QUEUE_WORKERS_ENABLED=false` on the API server instances.
2.  Run a separate worker process:
    ```bash
    npm run queue:start
    ```
    *(Note: You may need to create a dedicated worker entry point script if one doesn't exist)*.

## Troubleshooting

### Jobs are stuck in "waiting"
-   Check if Redis is running (`redis-cli ping`).
-   Verify workers are started (Is `QUEUE_WORKERS_ENABLED=true`?).
-   Check logs for connection errors.

### "Missing template" errors
-   If using `send-notification`, ensure the template exists in the `notification_templates` database table.
-   Run `npm run seed:templates` (if script exists) or insert manually.
