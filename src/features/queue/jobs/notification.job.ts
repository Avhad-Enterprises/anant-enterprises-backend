import { Queue } from 'bullmq';
import { logger } from '../../../utils';
import { QUEUE_REDIS_CONFIG, QueueName } from '../shared/config';

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

export interface BatchNotificationJobData {
    userIds: string[];
    templateCode: string;
    variables: Record<string, any>;
    options?: {
        priority?: 'low' | 'normal' | 'high' | 'urgent';
        actionUrl?: string;
        actionText?: string;
    };
}

class NotificationQueue {
    private queue: Queue<SendNotificationJobData | BatchNotificationJobData> | null = null;

    async getQueue(): Promise<Queue<SendNotificationJobData | BatchNotificationJobData>> {
        if (!this.queue) {
            this.queue = new Queue(QueueName.NOTIFICATIONS, {
                connection: QUEUE_REDIS_CONFIG,
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
     * Queue a single notification
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
     * Queue batch notifications
     */
    async sendBatchNotification(data: BatchNotificationJobData): Promise<void> {
        const queue = await this.getQueue();

        await queue.add('batch-notification', data, {
            priority: this.getPriority(data.options?.priority),
        });

        logger.info('Batch notification job queued', {
            userCount: data.userIds.length,
            templateCode: data.templateCode,
            options: data.options, // Debug: log full options including actionUrl
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
