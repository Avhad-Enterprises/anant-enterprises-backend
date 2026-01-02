/**
 * Core Queue Service
 *
 * Provides centralized queue management functionality:
 * - Queue creation and lifecycle management
 * - Health checks and monitoring
 * - Job management (retry, clear)
 * - Graceful shutdown
 *
 * Follows singleton pattern like AuditService
 */

import { Queue } from 'bullmq';
import { logger } from '../../../utils';
import {
    QueueName,
    QUEUE_REDIS_CONFIG,
    DEFAULT_JOB_OPTIONS,
} from '../shared/config';
import type { IQueueService, QueueHealth, JobInfo } from '../shared/interface';

/**
 * Queue Service Class
 * Manages all queue instances and operations
 */
class QueueService implements IQueueService {
    private queues: Map<string, Queue>;

    constructor() {
        this.queues = new Map();
    }

    /**
     * Get or create a queue instance
     * Uses singleton pattern for queue instances
     *
     * @param name - Queue name
     * @returns Queue instance
     */
    public getOrCreateQueue(name: QueueName): Queue {
        const existing = this.queues.get(name);
        if (existing) {
            return existing;
        }

        logger.info('Creating new queue', { name });

        const queue = new Queue(name, {
            connection: QUEUE_REDIS_CONFIG,
            defaultJobOptions: DEFAULT_JOB_OPTIONS,
        });

        // Set up queue event listeners
        queue.on('error', error => {
            logger.error('Queue error', { queue: name, error });
        });

        queue.on('waiting', job => {
            logger.debug('Job waiting', { queue: name, jobId: job.id });
        });

        this.queues.set(name, queue);
        logger.info('Queue created successfully', { name });

        return queue;
    }

    /**
     * Get health status of all queues
     *
     * @returns Array of queue health statuses
     */
    public async getQueueHealth(): Promise<QueueHealth[]> {
        try {
            const allQueueNames = Object.values(QueueName);
            const healthPromises = allQueueNames.map(name => this.getQueueHealthByName(name));
            const results = await Promise.all(healthPromises);
            return results.filter((h): h is QueueHealth => h !== null);
        } catch (error) {
            logger.error('Failed to get queue health', { error });
            return [];
        }
    }

    /**
     * Get health status of a specific queue
     *
     * @param queueName - Name of the queue
     * @returns Queue health status or null if error
     */
    public async getQueueHealthByName(queueName: string): Promise<QueueHealth | null> {
        try {
            const queue = this.queues.get(queueName);
            if (!queue) {
                // Queue not initialized yet
                return {
                    name: queueName,
                    isHealthy: false,
                    waiting: 0,
                    active: 0,
                    completed: 0,
                    failed: 0,
                    delayed: 0,
                    paused: false,
                };
            }

            const [waiting, active, completed, failed, delayed, isPaused] = await Promise.all([
                queue.getWaitingCount(),
                queue.getActiveCount(),
                queue.getCompletedCount(),
                queue.getFailedCount(),
                queue.getDelayedCount(),
                queue.isPaused(),
            ]);

            return {
                name: queueName,
                isHealthy: true,
                waiting,
                active,
                completed,
                failed,
                delayed,
                paused: isPaused,
            };
        } catch (error) {
            logger.error('Failed to get queue health', { queueName, error });
            return null;
        }
    }

    /**
     * Get jobs in a queue by status
     *
     * @param queueName - Name of the queue
     * @param status - Job status to filter by
     * @param start - Start index (default: 0)
     * @param end - End index (default: 99)
     * @returns Array of job information
     */
    public async getQueueJobs(
        queueName: string,
        status: 'waiting' | 'active' | 'completed' | 'failed',
        start: number = 0,
        end: number = 99
    ): Promise<JobInfo[]> {
        try {
            const queue = this.queues.get(queueName);
            if (!queue) {
                logger.warn('Queue not found', { queueName });
                return [];
            }

            let jobs;
            switch (status) {
                case 'waiting':
                    jobs = await queue.getWaiting(start, end);
                    break;
                case 'active':
                    jobs = await queue.getActive(start, end);
                    break;
                case 'completed':
                    jobs = await queue.getCompleted(start, end);
                    break;
                case 'failed':
                    jobs = await queue.getFailed(start, end);
                    break;
                default:
                    return [];
            }

            return jobs.map(job => ({
                id: job.id as string,
                name: job.name,
                data: job.data,
                opts: {
                    attempts: job.opts.attempts || 0,
                    delay: job.opts.delay,
                    timestamp: job.timestamp,
                },
                progress: job.progress,
                attemptsMade: job.attemptsMade,
                failedReason: job.failedReason,
                stacktrace: job.stacktrace,
                returnvalue: job.returnvalue,
                finishedOn: job.finishedOn,
                processedOn: job.processedOn,
            }));
        } catch (error) {
            logger.error('Failed to get queue jobs', { queueName, status, error });
            return [];
        }
    }

    /**
     * Retry all failed jobs in a queue
     *
     * @param queueName - Name of the queue
     * @returns Number of jobs retried
     */
    public async retryFailedJobs(queueName: string): Promise<number> {
        try {
            const queue = this.queues.get(queueName);
            if (!queue) {
                logger.warn('Queue not found', { queueName });
                return 0;
            }

            const failedJobs = await queue.getFailed();
            let retriedCount = 0;

            for (const job of failedJobs) {
                try {
                    await job.retry();
                    retriedCount++;
                } catch (error) {
                    logger.error('Failed to retry job', { jobId: job.id, error });
                }
            }

            logger.info('Retried failed jobs', { queueName, retriedCount });
            return retriedCount;
        } catch (error) {
            logger.error('Failed to retry failed jobs', { queueName, error });
            return 0;
        }
    }

    /**
     * Clear all jobs from a queue
     *
     * @param queueName - Name of the queue
     */
    public async clearQueue(queueName: string): Promise<void> {
        try {
            const queue = this.queues.get(queueName);
            if (!queue) {
                logger.warn('Queue not found', { queueName });
                return;
            }

            await queue.drain();
            await queue.clean(0, 0, 'completed');
            await queue.clean(0, 0, 'failed');

            logger.info('Queue cleared', { queueName });
        } catch (error) {
            logger.error('Failed to clear queue', { queueName, error });
            throw error;
        }
    }

    /**
     * Pause a queue
     *
     * @param queueName - Name of the queue
     */
    public async pauseQueue(queueName: string): Promise<void> {
        try {
            const queue = this.queues.get(queueName);
            if (!queue) {
                logger.warn('Queue not found', { queueName });
                return;
            }

            await queue.pause();
            logger.info('Queue paused', { queueName });
        } catch (error) {
            logger.error('Failed to pause queue', { queueName, error });
            throw error;
        }
    }

    /**
     * Resume a paused queue
     *
     * @param queueName - Name of the queue
     */
    public async resumeQueue(queueName: string): Promise<void> {
        try {
            const queue = this.queues.get(queueName);
            if (!queue) {
                logger.warn('Queue not found', { queueName });
                return;
            }

            await queue.resume();
            logger.info('Queue resumed', { queueName });
        } catch (error) {
            logger.error('Failed to resume queue', { queueName, error });
            throw error;
        }
    }

    /**
     * Get all queue names
     *
     * @returns Array of queue names
     */
    public getQueueNames(): string[] {
        return Array.from(this.queues.keys());
    }

    /**
     * Gracefully shutdown all queues
     * Waits for active jobs to complete
     */
    public async shutdownAll(): Promise<void> {
        try {
            logger.info('Shutting down all queues...');

            const closePromises = Array.from(this.queues.values()).map(queue => queue.close());

            await Promise.all(closePromises);

            this.queues.clear();

            logger.info('All queues shut down successfully');
        } catch (error) {
            logger.error('Error during queue shutdown', { error });
            throw error;
        }
    }
}

// Export singleton instance
export const queueService = new QueueService();

// Export class for testing
export { QueueService };
