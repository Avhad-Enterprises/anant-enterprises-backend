/**
 * Order Worker
 *
 * Processes order-related events:
 * - ORDER_CREATED: Send confirmation email, reserve inventory, create audit log
 * - ORDER_PAID: Update order status, trigger fulfillment
 * - ORDER_SHIPPED: Send shipping notification
 * - ORDER_CANCELLED: Release inventory, process refund
 */

import { Job } from 'bullmq';
import { BaseWorker } from './base.worker';
import { QueueName } from '../../shared/config';
import { QueueEventType } from '../../shared/types';
import type {
    OrderCreatedData,
    OrderPaidData,
    OrderShippedData,
    OrderCancelledData,
} from '../../shared/types';
import { logger } from '../../../../utils';
import { eventPublisher } from '../event-publisher.service';
import { auditService, AuditAction, AuditResourceType } from '../../../audit';

/**
 * Order Worker Class
 * Handles all order-related queue events
 */
class OrderWorker extends BaseWorker {
    constructor() {
        super(QueueName.ORDERS);
    }

    /**
     * Process order events
     */
    protected async processJob(job: Job): Promise<void> {
        const { type, data } = job.data;

        switch (type) {
            case QueueEventType.ORDER_CREATED:
                await this.handleOrderCreated(data as OrderCreatedData);
                break;
            case QueueEventType.ORDER_PAID:
                await this.handleOrderPaid(data as OrderPaidData);
                break;
            case QueueEventType.ORDER_SHIPPED:
                await this.handleOrderShipped(data as OrderShippedData);
                break;
            case QueueEventType.ORDER_CANCELLED:
                await this.handleOrderCancelled(data as OrderCancelledData);
                break;
            default:
                logger.warn('Unknown order event type', { type });
        }
    }

    /**
     * Handle ORDER_CREATED event
     * - Send confirmation email (Unified)
     * - Reserve inventory
     * - Create audit log
     */
    private async handleOrderCreated(data: OrderCreatedData): Promise<void> {
        logger.info('Processing ORDER_CREATED', { orderId: data.orderId });

        try {
            // Send order confirmation via unified notification service
            // This handles Email, In-App, and Socket broadcasts
            await eventPublisher.publishNotification({
                userId: data.userId,
                templateCode: 'ORDER_CREATED',
                variables: {
                    orderNumber: data.orderNumber,
                    userName: data.userName,
                    items: data.items,
                    subtotal: data.subtotal,
                    tax: data.tax,
                    shipping: data.shipping,
                    total: data.total,
                    currency: data.currency,
                    orderUrl: `${process.env.FRONTEND_URL}/profile/orders/${data.orderId}`,
                },
                options: {
                    priority: 'high',
                    actionUrl: `/profile/orders/${data.orderId}`,
                    actionText: 'View Order',
                },
            });

            // Reserve inventory for the order items
            await eventPublisher.publishInventoryReserved({
                orderId: data.orderId,
                items: data.items.map(item => ({
                    productId: item.productId,
                    variantId: item.variantId,
                    quantity: item.quantity,
                })),
                reservedBy: data.userId,
            });

            await auditService.log({
                action: AuditAction.ORDER_CREATED,
                resourceType: AuditResourceType.ORDER,
                resourceId: data.orderId,
                userId: data.userId,
                newValues: {
                    orderNumber: data.orderNumber,
                    total: data.total,
                    itemCount: data.items.length,
                },
            });

            logger.info('ORDER_CREATED processed successfully', { orderId: data.orderId });
        } catch (error) {
            logger.error('Failed to process ORDER_CREATED', { orderId: data.orderId, error });
            throw error; // Trigger retry
        }
    }

    /**
     * Handle ORDER_PAID event
     * - Update order to confirmed status
     * - Trigger fulfillment workflow
     */
    private async handleOrderPaid(data: OrderPaidData): Promise<void> {
        logger.info('Processing ORDER_PAID', { orderId: data.orderId });

        try {
            // Send payment confirmation notification
            await eventPublisher.publishNotification({
                userId: data.userId,
                templateCode: 'PAYMENT_CONFIRMED',
                variables: {
                    orderNumber: data.orderNumber,
                    amount: data.amount,
                    currency: data.currency,
                    paymentMethod: data.paymentMethod,
                    paidAt: data.paidAt,
                },
                options: {
                    priority: 'high',
                    actionUrl: `/profile/orders/${data.orderId}`,
                    actionText: 'View Order',
                },
            });

            await auditService.log({
                action: AuditAction.ORDER_PAID,
                resourceType: AuditResourceType.ORDER,
                resourceId: data.orderId,
                userId: data.userId,
                newValues: {
                    paymentId: data.paymentId,
                    amount: data.amount,
                    paymentMethod: data.paymentMethod,
                },
            });

            logger.info('ORDER_PAID processed successfully', { orderId: data.orderId });
        } catch (error) {
            logger.error('Failed to process ORDER_PAID', { orderId: data.orderId, error });
            throw error;
        }
    }

    /**
     * Handle ORDER_SHIPPED event
     * - Send shipping notification
     */
    private async handleOrderShipped(data: OrderShippedData): Promise<void> {
        logger.info('Processing ORDER_SHIPPED', { orderId: data.orderId });

        try {
            // Send shipping notification
            await eventPublisher.publishNotification({
                userId: data.userId,
                templateCode: 'ORDER_SHIPPED',
                variables: {
                    orderNumber: data.orderNumber,
                    trackingNumber: data.trackingNumber || 'Not available',
                    carrier: data.carrier || 'Not specified',
                    estimatedDelivery: data.estimatedDelivery,
                },
                options: {
                    priority: 'normal',
                    actionUrl: `/profile/orders/${data.orderId}`,
                    actionText: 'Track Order',
                },
            });

            await auditService.log({
                action: AuditAction.ORDER_SHIPPED,
                resourceType: AuditResourceType.ORDER,
                resourceId: data.orderId,
                userId: data.userId,
                newValues: {
                    trackingNumber: data.trackingNumber,
                    carrier: data.carrier,
                },
            });

            logger.info('ORDER_SHIPPED processed successfully', { orderId: data.orderId });
        } catch (error) {
            logger.error('Failed to process ORDER_SHIPPED', { orderId: data.orderId, error });
            throw error;
        }
    }

    /**
     * Handle ORDER_CANCELLED event
     * - Release reserved inventory
     * - Trigger refund if paid
     */
    private async handleOrderCancelled(data: OrderCancelledData): Promise<void> {
        logger.info('Processing ORDER_CANCELLED', { orderId: data.orderId });

        try {
            // Release inventory
            await eventPublisher.publishInventoryReleased({
                orderId: data.orderId,
                items: data.items.map(item => ({
                    productId: item.productId,
                    variantId: item.variantId,
                    quantity: item.quantity,
                })),
                reason: 'cancelled',
                releasedBy: data.cancelledBy,
            });

            // Note: We don't send a specific "CANCELLED" template yet in the seed,
            // but if we did, we'd add it here. For now, just audit log.

            await auditService.log({
                action: AuditAction.ORDER_CANCELLED,
                resourceType: AuditResourceType.ORDER,
                resourceId: data.orderId,
                userId: data.cancelledBy,
                newValues: {
                    reason: data.reason,
                },
            });

            logger.info('ORDER_CANCELLED processed successfully', { orderId: data.orderId });
        } catch (error) {
            logger.error('Failed to process ORDER_CANCELLED', { orderId: data.orderId, error });
            throw error;
        }
    }
}

// Export singleton instance
export const orderWorker = new OrderWorker();

// Export class for testing
export { OrderWorker };
