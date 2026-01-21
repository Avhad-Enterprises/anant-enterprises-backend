/**
 * Event Publisher Service
 *
 * Provides type-safe event publishing functionality:
 * - Generic event publishing to appropriate queues
 * - Batch publishing support
 * - Helper methods for common events
 * - Error handling (logged but never thrown, like AuditService)
 *
 * Follows singleton pattern
 */

import { logger } from '../../../utils';
import { queueService } from './queue.service';
import {
    QueueName,
    JobPriority,
} from '../shared/config';
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
    UserRegisteredData,
} from '../shared/types';
import type { IEventPublisher } from '../shared/interface';

/**
 * Event Publisher Service Class
 * Handles all event publishing to queues
 */
class EventPublisherService implements IEventPublisher {
    /**
     * Publish a generic event to the appropriate queue
     * Never throws - errors are logged to prevent breaking main flow
     *
     * @param event - Event to publish
     */
    public async publish<T>(event: QueueEvent<T>): Promise<void> {
        try {
            const queue = queueService.getOrCreateQueue(event.queue);

            await queue.add(
                event.type,
                {
                    type: event.type,
                    data: event.data,
                    timestamp: event.timestamp,
                    metadata: event.metadata,
                },
                {
                    priority: event.priority || JobPriority.NORMAL,
                }
            );

            logger.info('Event published', {
                type: event.type,
                queue: event.queue,
                priority: event.priority,
            });
        } catch (error) {
            // Log error but don't throw - event publishing should never break main flow
            logger.error('Failed to publish event', {
                error,
                event: {
                    type: event.type,
                    queue: event.queue,
                },
            });
        }
    }

    /**
     * Publish multiple events in batch
     *
     * @param events - Array of events to publish
     */
    public async publishBatch(events: QueueEvent[]): Promise<void> {
        try {
            const publishPromises = events.map(event => this.publish(event));
            await Promise.all(publishPromises);

            logger.info('Batch events published', { count: events.length });
        } catch (error) {
            logger.error('Failed to publish batch events', { error, count: events.length });
        }
    }

    // ============================================
    // ORDER EVENT HELPERS
    // ============================================

    /**
     * Publish order created event
     *
     * @param data - Order created data
     */
    public async publishOrderCreated(data: OrderCreatedData): Promise<void> {
        await this.publish({
            type: 'ORDER_CREATED' as QueueEventType,
            queue: QueueName.ORDERS,
            data,
            timestamp: new Date(),
            priority: JobPriority.HIGH,
        });
    }

    /**
     * Publish order paid event
     *
     * @param data - Order paid data
     */
    public async publishOrderPaid(data: OrderPaidData): Promise<void> {
        await this.publish({
            type: 'ORDER_PAID' as QueueEventType,
            queue: QueueName.ORDERS,
            data,
            timestamp: new Date(),
            priority: JobPriority.HIGH,
        });
    }

    /**
     * Publish order shipped event
     *
     * @param data - Order shipped data
     */
    public async publishOrderShipped(data: OrderShippedData): Promise<void> {
        await this.publish({
            type: 'ORDER_SHIPPED' as QueueEventType,
            queue: QueueName.ORDERS,
            data,
            timestamp: new Date(),
            priority: JobPriority.NORMAL,
        });
    }

    /**
     * Publish order cancelled event
     *
     * @param data - Order cancelled data
     */
    public async publishOrderCancelled(data: OrderCancelledData): Promise<void> {
        await this.publish({
            type: 'ORDER_CANCELLED' as QueueEventType,
            queue: QueueName.ORDERS,
            data,
            timestamp: new Date(),
            priority: JobPriority.HIGH,
        });
    }

    // ============================================
    // PAYMENT EVENT HELPERS
    // ============================================

    /**
     * Publish payment processed event
     *
     * @param data - Payment processed data
     */
    public async publishPaymentProcessed(data: PaymentProcessedData): Promise<void> {
        await this.publish({
            type: 'PAYMENT_AUTHORIZED' as QueueEventType,
            queue: QueueName.PAYMENTS,
            data,
            timestamp: new Date(),
            priority: JobPriority.CRITICAL,
        });
    }

    /**
     * Publish payment refunded event
     *
     * @param data - Payment refunded data
     */
    public async publishPaymentRefunded(data: PaymentRefundedData): Promise<void> {
        await this.publish({
            type: 'PAYMENT_REFUNDED' as QueueEventType,
            queue: QueueName.PAYMENTS,
            data,
            timestamp: new Date(),
            priority: JobPriority.HIGH,
        });
    }

    // ============================================
    // INVENTORY EVENT HELPERS
    // ============================================

    /**
     * Publish inventory reserved event
     *
     * @param data - Inventory reserved data
     */
    public async publishInventoryReserved(data: InventoryReservedData): Promise<void> {
        await this.publish({
            type: 'INVENTORY_RESERVED' as QueueEventType,
            queue: QueueName.INVENTORY,
            data,
            timestamp: new Date(),
            priority: JobPriority.HIGH,
        });
    }

    /**
     * Publish inventory released event
     *
     * @param data - Inventory released data
     */
    public async publishInventoryReleased(data: InventoryReleasedData): Promise<void> {
        await this.publish({
            type: 'INVENTORY_RELEASED' as QueueEventType,
            queue: QueueName.INVENTORY,
            data,
            timestamp: new Date(),
            priority: JobPriority.HIGH,
        });
    }

    /**
     * Publish inventory adjusted event
     *
     * @param data - Inventory adjusted data
     */
    public async publishInventoryAdjusted(data: InventoryAdjustedData): Promise<void> {
        await this.publish({
            type: 'INVENTORY_ADJUSTED' as QueueEventType,
            queue: QueueName.INVENTORY,
            data,
            timestamp: new Date(),
            priority: JobPriority.NORMAL,
        });
    }

    /**
     * Publish low stock alert
     *
     * @param data - Stock alert data
     */
    public async publishLowStockAlert(data: StockAlertData): Promise<void> {
        await this.publish({
            type: 'LOW_STOCK_ALERT' as QueueEventType,
            queue: QueueName.INVENTORY,
            data,
            timestamp: new Date(),
            priority: JobPriority.NORMAL,
        });
    }

    /**
     * Publish out of stock alert
     *
     * @param data - Stock alert data
     */
    public async publishOutOfStockAlert(data: StockAlertData): Promise<void> {
        await this.publish({
            type: 'OUT_OF_STOCK_ALERT' as QueueEventType,
            queue: QueueName.INVENTORY,
            data,
            timestamp: new Date(),
            priority: JobPriority.HIGH,
        });
    }

    // ============================================
    // NOTIFICATION EVENT HELPERS
    // ============================================

    /**
     * Publish email notification event
     *
     * @param data - Email notification data
     */
    public async publishEmailNotification(data: EmailNotificationData): Promise<void> {
        await this.publish({
            type: 'SEND_EMAIL' as QueueEventType,
            queue: QueueName.NOTIFICATIONS,
            data,
            timestamp: new Date(),
            priority: data.priority || JobPriority.NORMAL,
        });
    }

    /**
     * Publish SMS notification event
     *
     * @param data - SMS notification data
     */
    public async publishSMSNotification(data: SMSNotificationData): Promise<void> {
        await this.publish({
            type: 'SEND_SMS' as QueueEventType,
            queue: QueueName.NOTIFICATIONS,
            data,
            timestamp: new Date(),
            priority: data.priority || JobPriority.NORMAL,
        });
    }

    // ============================================
    // USER EVENT HELPERS
    // ============================================

    /**
     * Publish user registered event
     *
     * @param data - User registered data
     */
    public async publishUserRegistered(data: UserRegisteredData): Promise<void> {
        await this.publish({
            type: 'USER_REGISTERED' as QueueEventType,
            queue: QueueName.NOTIFICATIONS,
            data,
            timestamp: new Date(),
            priority: JobPriority.NORMAL,
        });
    }

    // ============================================
    // NOTIFICATION EVENT HELPERS
    // ============================================

    /**
     * Publish notification event (single notification)
     * Queues a notification to be sent via the notification service
     */
    public async publishNotification(data: {
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
        try {
            const { notificationQueue } = await import('../jobs/notification.job');
            await notificationQueue.sendNotification(data);

            // Assuming logger is defined elsewhere
            // logger.info('Notification event published', {
            //     userId: data.userId,
            //     templateCode: data.templateCode,
            // });
        } catch (error) {
            logger.error('Failed to publish notification event', {
                error,
                userId: data.userId,
                templateCode: data.templateCode,
            });
        }
    }

    /**
     * Publish batch notification event (multiple users)
     * Queues notifications to be sent to multiple users
     */
    public async publishBatchNotification(data: {
        userIds: string[];
        templateCode: string;
        variables: Record<string, any>;
        options?: {
            priority?: 'low' | 'normal' | 'high' | 'urgent';
        };
    }): Promise<void> {
        try {
            const { notificationQueue } = await import('../jobs/notification.job');
            await notificationQueue.sendBatchNotification(data);

            // Assuming logger is defined elsewhere
            // logger.info('Batch notification event published', {
            //     userCount: data.userIds.length,
            //     templateCode: data.templateCode,
            // });
        } catch (error) {
            logger.error('Failed to publish batch notification event', {
                error,
                userCount: data.userIds.length,
                templateCode: data.templateCode,
            });
        }
    }
}

// Export singleton instance
export const eventPublisher = new EventPublisherService();

// Export class for testing
export { EventPublisherService };
