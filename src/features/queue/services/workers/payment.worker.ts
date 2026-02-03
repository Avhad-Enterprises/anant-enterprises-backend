/**
 * Payment Worker
 *
 * Processes payment-related events:
 * - PAYMENT_AUTHORIZED: Update payment status, notify user
 * - PAYMENT_CAPTURED: Confirm order, trigger fulfillment
 * - PAYMENT_FAILED: Notify user, cleanup
 * - PAYMENT_REFUNDED: Update order, notify user
 */

import { Job } from 'bullmq';
import { BaseWorker } from './base.worker';
import { QueueName } from '../../shared/config';
import { QueueEventType } from '../../shared/types';
import type { PaymentProcessedData, PaymentRefundedData } from '../../shared/types';
import { logger } from '../../../../utils';
import { eventPublisher } from '../event-publisher.service';
import { auditService, AuditAction, AuditResourceType } from '../../../audit';

/**
 * Payment Worker Class
 */
class PaymentWorker extends BaseWorker {
    constructor() {
        super(QueueName.PAYMENTS);
    }

    protected async processJob(job: Job): Promise<void> {
        const { type, data } = job.data;

        switch (type) {
            case QueueEventType.PAYMENT_AUTHORIZED:
                await this.handlePaymentAuthorized(data as PaymentProcessedData);
                break;
            case QueueEventType.PAYMENT_CAPTURED:
                await this.handlePaymentCaptured(data as PaymentProcessedData);
                break;
            case QueueEventType.PAYMENT_FAILED:
                await this.handlePaymentFailed(data as PaymentProcessedData);
                break;
            case QueueEventType.PAYMENT_REFUNDED:
                await this.handlePaymentRefunded(data as PaymentRefundedData);
                break;
            default:
                logger.warn('Unknown payment event type', { type });
        }
    }

    private async handlePaymentAuthorized(data: PaymentProcessedData): Promise<void> {
        logger.info('Processing PAYMENT_AUTHORIZED', { paymentId: data.paymentId });

        try {
            // Audit log
            await auditService.log({
                action: AuditAction.PAYMENT_AUTHORIZED,
                resourceType: AuditResourceType.ORDER,
                resourceId: data.orderId,
                userId: data.userId,
                newValues: {
                    paymentId: data.paymentId,
                    amount: data.amount,
                    paymentMethod: data.paymentMethod,
                },
            });

            logger.info('PAYMENT_AUTHORIZED processed', { paymentId: data.paymentId });
        } catch (error) {
            logger.error('Failed to process PAYMENT_AUTHORIZED', { error });
            throw error;
        }
    }

    private async handlePaymentCaptured(data: PaymentProcessedData): Promise<void> {
        logger.info('Processing PAYMENT_CAPTURED', { paymentId: data.paymentId });

        try {
            // Create audit log
            await auditService.log({
                action: AuditAction.PAYMENT_CAPTURED,
                resourceType: AuditResourceType.ORDER,
                resourceId: data.orderId,
                userId: data.userId,
                newValues: {
                    paymentId: data.paymentId,
                    amount: data.amount,
                    transactionId: data.transactionId,
                },
            });

            logger.info('PAYMENT_CAPTURED processed', { paymentId: data.paymentId });
        } catch (error) {
            logger.error('Failed to process PAYMENT_CAPTURED', { error });
            throw error;
        }
    }

    private async handlePaymentFailed(data: PaymentProcessedData): Promise<void> {
        logger.info('Processing PAYMENT_FAILED', { paymentId: data.paymentId });

        try {
            // Send failure notification via unified service
            await eventPublisher.publishNotification({
                userId: data.userId,
                templateCode: 'PAYMENT_FAILED',
                variables: {
                    amount: data.amount,
                    currency: data.currency,
                    paymentMethod: data.paymentMethod,
                    errorMessage: data.errorMessage || 'Please try again',
                },
                options: {
                    priority: 'high',
                    actionUrl: `/profile/orders/${data.orderId}`,
                    actionText: 'Retry Payment',
                },
            });

            // Audit log
            await auditService.log({
                action: AuditAction.PAYMENT_FAILED,
                resourceType: AuditResourceType.ORDER,
                resourceId: data.orderId,
                userId: data.userId,
                newValues: {
                    paymentId: data.paymentId,
                    errorMessage: data.errorMessage,
                },
            });

            logger.info('PAYMENT_FAILED processed', { paymentId: data.paymentId });
        } catch (error) {
            logger.error('Failed to process PAYMENT_FAILED', { error });
            throw error;
        }
    }

    private async handlePaymentRefunded(data: PaymentRefundedData): Promise<void> {
        logger.info('Processing PAYMENT_REFUNDED', { refundId: data.refundId });

        try {
            // Send refund notification
            // Note: data.orderId is passed as recipient in old code, assuming it was a mistake or handled upstream.
            // But notifications require userId. The event data technically has orderId but not explicit userId?
            // Actually PaymentRefundedData interface HAS `userId`? Let's check types.ts
            // Wait, looking at PaymentRefundedData in types.ts:
            // export interface PaymentRefundedData { paymentId, orderId, refundId, amount, currency, reason, refundedAt }
            // It DOES NOT have userId! This is a problem.
            // However, handlePaymentRefunded in the OLD code used `to: data.orderId`. OLD code: `to: data.orderId`.
            // That's weird. It implies the old code was broken or trying to look up email by orderId?
            // But `publishEmailNotification` takes `to: string | string[]` which is email address.
            // Passing orderId there would fail unless orderId IS an email (unlikely).
            //
            // Let's look at `PaymentWorker` source again.
            // `to: data.orderId` // Will be resolved
            // The comment says "Will be resolved". But `eventPublisher.publishEmailNotification` just queues it.
            // If `NotificationWorker` receives an ID as email, `nodemailer` will fail.
            //
            // FIX: We need to fetch userId or email. But `NotificationService` requires `userId`.
            // We should modify `PaymentRefundedData` to include `userId` or fetch it here.
            // Fetching it here requires DB access `orders` table.

            // To be safe and quick, let's fetch the order to get userId.
            const { orders } = await import('../../../orders/shared/orders.schema');
            const { eq } = await import('drizzle-orm');
            const { db } = await import('../../../../database');

            const [order] = await db.select({ userId: orders.user_id }).from(orders).where(eq(orders.id, data.orderId)).limit(1);

            if (order && order.userId) {
                await eventPublisher.publishNotification({
                    userId: order.userId,
                    templateCode: 'PAYMENT_REFUNDED',
                    variables: {
                        amount: data.amount,
                        currency: data.currency,
                        reason: data.reason || 'Customer request',
                        refundedAt: data.refundedAt,
                    },
                    options: {
                        priority: 'normal',
                        actionUrl: `/profile/orders/${data.orderId}`,
                        actionText: 'View Order',
                    }
                });
            } else {
                logger.warn('Could not find order or user for refund notification', { orderId: data.orderId });
            }

            // Audit log
            await auditService.log({
                action: AuditAction.PAYMENT_REFUNDED,
                resourceType: AuditResourceType.ORDER,
                resourceId: data.orderId,
                newValues: {
                    refundId: data.refundId,
                    amount: data.amount,
                    reason: data.reason,
                },
            });

            logger.info('PAYMENT_REFUNDED processed', { refundId: data.refundId });
        } catch (error) {
            logger.error('Failed to process PAYMENT_REFUNDED', { error });
            throw error;
        }
    }
}

export const paymentWorker = new PaymentWorker();
export { PaymentWorker };
