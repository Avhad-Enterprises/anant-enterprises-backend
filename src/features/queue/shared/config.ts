/**
 * Queue Configuration
 *
 * Central configuration for all BullMQ queues including:
 * - Default job options (retry, backoff, removal)
 * - Queue priorities
 * - Worker concurrency settings
 * - Connection settings
 */

import { config } from '../../../utils/validateEnv';

/**
 * Queue names enum
 * Defines all queue names used in the system
 */
export enum QueueName {
    ORDERS = 'orders-queue',
    PAYMENTS = 'payments-queue',
    INVENTORY = 'inventory-queue',
    NOTIFICATIONS = 'notifications-queue',
}

/**
 * Job priority levels
 * Lower number = higher priority
 */
export enum JobPriority {
    CRITICAL = 1,
    HIGH = 2,
    NORMAL = 3,
    LOW = 4,
}

/**
 * Default job options for all queues
 * These settings apply unless overridden per-job
 */
export const DEFAULT_JOB_OPTIONS = {
    attempts: 3,
    backoff: {
        type: 'exponential' as const,
        delay: 2000, // Base delay of 2 seconds
    },
    removeOnComplete: {
        age: 86400, // Remove completed jobs after 24 hours
        count: 1000, // Keep max 1000 completed jobs
    },
    removeOnFail: {
        age: 604800, // Keep failed jobs for 7 days
    },
};

/**
 * Worker concurrency settings
 * Number of concurrent jobs each worker can process
 * Reduced defaults to prevent Redis connection exhaustion
 */
export const WORKER_CONCURRENCY = {
    [QueueName.ORDERS]: config.QUEUE_CONCURRENCY || 3,
    [QueueName.PAYMENTS]: config.QUEUE_CONCURRENCY || 2,
    [QueueName.INVENTORY]: config.QUEUE_CONCURRENCY || 3,
    [QueueName.NOTIFICATIONS]: config.QUEUE_CONCURRENCY || 5,
};

/**
 * Optimized Redis connection configuration for BullMQ
 * 
 * Key settings to prevent connection exhaustion:
 * - maxRetriesPerRequest: null (required for BullMQ blocking commands)
 * - enableOfflineQueue: false (fail fast, don't queue commands)
 * - keepAlive: 30000 (keep connections alive)
 * - retryStrategy: exponential backoff with max delay
 * 
 * BullMQ will internally reuse connections when using the same config object
 */
export const QUEUE_REDIS_CONFIG = {
    host: config.REDIS_HOST,
    port: config.REDIS_PORT,
    password: config.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null, // Required for BullMQ
    enableReadyCheck: false,
    enableOfflineQueue: false,
    // Connection optimization
    lazyConnect: false,
    keepAlive: 30000,
    connectTimeout: 10000,
    // Retry strategy with exponential backoff
    retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
    },
};

/**
 * Dead Letter Queue suffix
 */
export const DLQ_SUFFIX = '-dlq';

/**
 * Get DLQ name for a queue
 */
export function getDLQName(queueName: QueueName): string {
    return `${queueName}${DLQ_SUFFIX}`;
}
