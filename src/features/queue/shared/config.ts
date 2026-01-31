/**
 * Queue Configuration
 *
 * Central configuration for all BullMQ queues including:
 * - Default job options (retry, backoff, removal)
 * - Queue priorities
 * - Worker concurrency settings
 * - Connection settings
 */

import IORedis from 'ioredis';
import { config } from '../../../utils/validateEnv';
import { logger } from '../../../utils';

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
 * Shared Redis connection for all BullMQ workers
 * Using IORedis with connection pooling to prevent connection exhaustion
 */
let sharedRedisConnection: IORedis | null = null;

export const getSharedRedisConnection = (): IORedis => {
    if (!sharedRedisConnection) {
        sharedRedisConnection = new IORedis({
            host: config.REDIS_HOST,
            port: config.REDIS_PORT,
            password: config.REDIS_PASSWORD || undefined,
            maxRetriesPerRequest: null, // Required for BullMQ
            enableReadyCheck: false,
            enableOfflineQueue: false,
            // Connection pool settings
            lazyConnect: false,
            keepAlive: 30000,
            connectTimeout: 10000,
            // Retry strategy
            retryStrategy: (times: number) => {
                const delay = Math.min(times * 50, 2000);
                logger.warn(`Redis connection retry attempt ${times}, waiting ${delay}ms`);
                return delay;
            },
            // Error handling
            reconnectOnError: (err) => {
                logger.error('Redis reconnect on error', { error: err.message });
                const targetError = 'READONLY';
                if (err.message.includes(targetError)) {
                    // Only reconnect on READONLY error
                    return true;
                }
                return false;
            },
        });

        // Log connection events
        sharedRedisConnection.on('connect', () => {
            logger.info('✅ BullMQ shared Redis connection established');
        });

        sharedRedisConnection.on('ready', () => {
            logger.info('✅ BullMQ shared Redis connection ready');
        });

        sharedRedisConnection.on('error', (err) => {
            logger.error('❌ BullMQ shared Redis connection error', { error: err.message });
        });

        sharedRedisConnection.on('close', () => {
            logger.warn('⚠️ BullMQ shared Redis connection closed');
        });

        sharedRedisConnection.on('reconnecting', () => {
            logger.info('🔄 BullMQ shared Redis reconnecting...');
        });
    }

    return sharedRedisConnection;
};

/**
 * Close shared Redis connection
 */
export const closeSharedRedisConnection = async (): Promise<void> => {
    if (sharedRedisConnection) {
        logger.info('Closing shared Redis connection...');
        await sharedRedisConnection.quit();
        sharedRedisConnection = null;
    }
};

/**
 * Redis connection configuration for queues (legacy, kept for Queue initialization)
 * Workers should use getSharedRedisConnection() instead
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
