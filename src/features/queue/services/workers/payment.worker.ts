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
            // Send failure notification
            await eventPublisher.publishEmailNotification({
                to: data.userId,
                subject: 'Payment Failed - Action Required',
                template: 'payment_failed',
                templateData: {
                    amount: data.amount,
                    currency: data.currency,
                    paymentMethod: data.paymentMethod,
                    errorMessage: data.errorMessage || 'Please try again',
                },
                priority: 1,
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
            await eventPublisher.publishEmailNotification({
                to: data.orderId, // Will be resolved
                subject: 'Refund Processed',
                template: 'payment_refunded',
                templateData: {
                    amount: data.amount,
                    currency: data.currency,
                    reason: data.reason,
                    refundedAt: data.refundedAt,
                },
            });

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
