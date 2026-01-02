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
 */
export const WORKER_CONCURRENCY = {
    [QueueName.ORDERS]: config.QUEUE_CONCURRENCY || 5,
    [QueueName.PAYMENTS]: config.QUEUE_CONCURRENCY || 3,
    [QueueName.INVENTORY]: config.QUEUE_CONCURRENCY || 5,
    [QueueName.NOTIFICATIONS]: config.QUEUE_CONCURRENCY || 10,
};

/**
 * Redis connection configuration for queues
 */
export const QUEUE_REDIS_CONFIG = {
    host: config.REDIS_HOST,
    port: config.REDIS_PORT,
    password: config.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null, // Required for BullMQ
    enableOfflineQueue: false,
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
