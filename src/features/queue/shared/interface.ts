/**
 * Queue Feature Public Interfaces
 *
 * Public interfaces exported from the queue feature for use by other features.
 * Follows the pattern of features/audit/shared/interface.ts
 */

import type {
    QueueEvent,
    QueueEventType,
    OrderCreatedData,
    OrderPaidData,
    OrderShippedData,
    OrderCancelledData,
    PaymentProcessedData,
    PaymentRefundedData,
    InventoryReservedData,
    InventoryReleasedData,
    InventoryAdjustedData,
    StockAlertData,
    EmailNotificationData,
    SMSNotificationData,
    QueueHealth,
    JobInfo,
    WorkerHealth,
} from './types';

/**
 * Re-export types for public use
 */
export type {
    QueueEvent,
    QueueEventType,
    OrderCreatedData,
    OrderPaidData,
    OrderShippedData,
    OrderCancelledData,
    PaymentProcessedData,
    PaymentRefundedData,
    InventoryReservedData,
    InventoryReleasedData,
    InventoryAdjustedData,
    StockAlertData,
    EmailNotificationData,
    SMSNotificationData,
    QueueHealth,
    JobInfo,
    WorkerHealth,
};

/**
 * Event publisher interface
 * Defines methods for publishing events to queues
 */
export interface IEventPublisher {
    /**
     * Publish a generic event
     */
    publish<T>(event: QueueEvent<T>): Promise<void>;

    /**
     * Publish multiple events in batch
     */
    publishBatch(events: QueueEvent[]): Promise<void>;

    /**
     * Helper: Publish order created event
     */
    publishOrderCreated(data: OrderCreatedData): Promise<void>;

    /**
     * Helper: Publish order paid event
     */
    publishOrderPaid(data: OrderPaidData): Promise<void>;

    /**
     * Helper: Publish email notification
     */
    publishEmailNotification(data: EmailNotificationData): Promise<void>;
}

/**
 * Queue service interface
 * Defines methods for queue management
 */
export interface IQueueService {
    /**
     * Get health status of all queues
     */
    getQueueHealth(): Promise<QueueHealth[]>;

    /**
     * Get health status of a specific queue
     */
    getQueueHealthByName(queueName: string): Promise<QueueHealth | null>;

    /**
     * Get jobs in a queue
     */
    getQueueJobs(queueName: string, status: 'waiting' | 'active' | 'completed' | 'failed'): Promise<JobInfo[]>;

    /**
     * Retry all failed jobs in a queue
     */
    retryFailedJobs(queueName: string): Promise<number>;

    /**
     * Clear all jobs from a queue
     */
    clearQueue(queueName: string): Promise<void>;

    /**
     * Shutdown all queues gracefully
     */
    shutdownAll(): Promise<void>;
}
