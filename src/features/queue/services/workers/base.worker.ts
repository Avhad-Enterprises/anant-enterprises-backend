/**
 * Base Worker Class
 *
 * Abstract base class for all queue workers providing:
 * - Worker lifecycle management
 * - Common error handling patterns
 * - Logging
 * - Graceful shutdown
 *
 * All domain-specific workers should extend this class.
 */

import { Worker, Job } from 'bullmq';
import { logger } from '../../../../utils';
import { QUEUE_REDIS_CONFIG, WORKER_CONCURRENCY, QueueName } from '../../shared/config';

/**
 * Abstract Base Worker Class
 */
export abstract class BaseWorker {
    protected worker: Worker | null = null;
    protected queueName: QueueName;
    protected concurrency: number;
    protected isRunning: boolean = false;
    protected errorCount: number = 0;
    protected lastJobAt: Date | null = null;

    constructor(queueName: QueueName) {
        this.queueName = queueName;
        this.concurrency = WORKER_CONCURRENCY[queueName] || 5;
    }

    /**
     * Process a job - must be implemented by subclasses
     *
     * @param job - The job to process
     */
    protected abstract processJob(job: Job): Promise<void>;

    /**
     * Start the worker
     */
    public async start(): Promise<void> {
        if (this.isRunning) {
            logger.warn('Worker already running', { queue: this.queueName });
            return;
        }

        try {
            this.worker = new Worker(
                this.queueName,
                async (job: Job) => {
                    await this.handleJob(job);
                },
                {
                    connection: QUEUE_REDIS_CONFIG,
                    concurrency: this.concurrency,
                }
            );

            // Set up event listeners
            this.worker.on('completed', job => {
                logger.info('Job completed', {
                    queue: this.queueName,
                    jobId: job.id,
                    name: job.name,
                });
                this.lastJobAt = new Date();
            });

            this.worker.on('failed', (job, err) => {
                this.errorCount++;
                logger.error('Job failed', {
                    queue: this.queueName,
                    jobId: job?.id,
                    name: job?.name,
                    error: err.message,
                    attemptsMade: job?.attemptsMade,
                });
            });

            this.worker.on('error', err => {
                this.errorCount++;
                logger.error('Worker error', {
                    queue: this.queueName,
                    error: err.message,
                });
            });

            this.isRunning = true;
            logger.info('Worker started', {
                queue: this.queueName,
                concurrency: this.concurrency,
            });
        } catch (error) {
            logger.error('Failed to start worker', {
                queue: this.queueName,
                error,
            });
            throw error;
        }
    }

    /**
     * Handle job with error wrapper
     */
    private async handleJob(job: Job): Promise<void> {
        logger.info('Processing job', {
            queue: this.queueName,
            jobId: job.id,
            name: job.name,
            attemptsMade: job.attemptsMade,
        });

        try {
            await this.processJob(job);
            this.lastJobAt = new Date();
        } catch (error) {
            this.errorCount++;
            logger.error('Job processing error', {
                queue: this.queueName,
                jobId: job.id,
                name: job.name,
                error,
            });
            throw error; // Rethrow to trigger retry
        }
    }

    /**
     * Stop the worker gracefully
     */
    public async stop(): Promise<void> {
        if (!this.worker || !this.isRunning) {
            return;
        }

        try {
            logger.info('Stopping worker...', { queue: this.queueName });
            await this.worker.close();
            this.isRunning = false;
            logger.info('Worker stopped', { queue: this.queueName });
        } catch (error) {
            logger.error('Error stopping worker', {
                queue: this.queueName,
                error,
            });
            throw error;
        }
    }

    /**
     * Get worker health status
     */
    public getHealth() {
        return {
            name: this.queueName,
            isRunning: this.isRunning,
            concurrency: this.concurrency,
            processing: this.worker?.isRunning() ? 1 : 0,
            lastJobAt: this.lastJobAt,
            errorCount: this.errorCount,
        };
    }
}
