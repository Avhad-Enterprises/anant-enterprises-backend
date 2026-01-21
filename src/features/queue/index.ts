/**
 * Queue Feature Index
 *
 * Central exports for all queue-related functionality.
 * NOTE: API routers use dynamic imports to avoid circular dependency with middlewares
 *
 * Follows the pattern of features/rbac/index.ts and features/audit/index.ts
 */

// Main route export
export { default } from './route';

// Services - SAFE to export (no circular dependency)
export { queueService, QueueService } from './services/queue.service';
export { eventPublisher, EventPublisherService } from './services/event-publisher.service';

// Shared resources - SAFE to export
export * from './shared/types';
export * from './shared/config';
export * from './shared/interface';

// Worker Management
export {
    startWorkers,
    stopWorkers,
    getWorkersHealth,
    orderWorker,
    paymentWorker,
    inventoryWorker,
    notificationWorker,
} from './services/workers';
