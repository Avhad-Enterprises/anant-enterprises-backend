/**
 * Razorpay Service
 *
 * Wrapper around the Razorpay SDK providing:
 * - Order creation
 * - Payment signature verification
 * - Webhook signature verification
 * - Refund operations
 * - Payment fetching
 *
 * SECURITY NOTES:
 * - Uses timing-safe comparison for signature verification
 * - Never logs sensitive credentials
 * - All operations are audited
 */

import Razorpay from 'razorpay';
import crypto from 'crypto';
import { config } from '../../../utils/validateEnv';
import { logger } from '../../../utils';
import { HttpException } from '../../../utils';

// ============================================
// TYPES
// ============================================

interface CreateOrderOptions {
    amount: number; // Amount in paise (₹100 = 10000)
    currency?: string;
    receipt: string; // Order ID for reference
    notes?: Record<string, string>;
}

interface RazorpayOrderResponse {
    id: string;
    entity: 'order';
    amount: number;
    amount_paid: number;
    amount_due: number;
    currency: string;
    receipt: string;
    offer_id?: string;
    status: 'created' | 'attempted' | 'paid';
    attempts: number;
    notes: Record<string, string>;
    created_at: number;
}

interface CreateRefundOptions {
    amount?: number; // Partial refund amount in paise (full if omitted)
    speed?: 'normal' | 'optimum';
    notes?: Record<string, string>;
    receipt?: string;
}

interface RazorpayRefundResponse {
    id: string;
    entity: 'refund';
    amount: number;
    currency: string;
    payment_id: string;
    notes: Record<string, string>;
    receipt?: string;
    acquirer_data?: {
        rrn?: string;
    };
    status: 'pending' | 'processed' | 'failed';
    speed_requested: 'normal' | 'optimum';
    speed_processed?: 'normal' | 'optimum' | 'instant';
    created_at: number;
}

// ============================================
// RAZORPAY SERVICE CLASS
// ============================================

class RazorpayServiceClass {
    private razorpay: Razorpay;
    private keyId: string;
    private keySecret: string;
    private webhookSecret: string;

    constructor() {
        this.keyId = config.RAZORPAY_KEY_ID;
        this.keySecret = config.RAZORPAY_KEY_SECRET;
        this.webhookSecret = config.RAZORPAY_WEBHOOK_SECRET;

        this.razorpay = new Razorpay({
            key_id: this.keyId,
            key_secret: this.keySecret,
        });

        logger.info('RazorpayService initialized', {
            keyIdPrefix: this.keyId.substring(0, 12) + '...',
            isTestMode: this.keyId.startsWith('rzp_test'),
        });
    }

    /**
     * Get Razorpay Key ID (safe to expose to frontend)
     */
    getKeyId(): string {
        return this.keyId;
    }

    /**
     * Check if running in test mode
     */
    isTestMode(): boolean {
        return this.keyId.startsWith('rzp_test');
    }

    // ============================================
    // ORDER OPERATIONS
    // ============================================

    /**
     * Create a Razorpay order
     *
     * @param options - Order creation options
     * @returns Razorpay order object
     */
    async createOrder(options: CreateOrderOptions): Promise<RazorpayOrderResponse> {
        try {
            const order = await this.razorpay.orders.create({
                amount: options.amount,
                currency: options.currency || 'INR',
                receipt: options.receipt,
                notes: options.notes || {},
            });

            logger.info('Razorpay order created', {
                orderId: order.id,
                amount: order.amount,
                currency: order.currency,
                receipt: order.receipt,
            });

            return order as RazorpayOrderResponse;
        } catch (error) {
            logger.error('Failed to create Razorpay order', {
                error: error instanceof Error ? error.message : String(error),
                receipt: options.receipt,
            });
            throw new HttpException(500, 'Failed to create payment order. Please try again.');
        }
    }

    /**
     * Fetch order details from Razorpay
     */
    async getOrder(orderId: string): Promise<RazorpayOrderResponse> {
        try {
            const order = await this.razorpay.orders.fetch(orderId);
            return order as RazorpayOrderResponse;
        } catch (error) {
            logger.error('Failed to fetch Razorpay order', {
                orderId,
                error: error instanceof Error ? error.message : String(error),
            });
            throw new HttpException(500, 'Failed to fetch payment order.');
        }
    }

    // ============================================
    // PAYMENT OPERATIONS
    // ============================================

    /**
     * Fetch payment details from Razorpay
     */
    async getPayment(paymentId: string): Promise<Record<string, unknown>> {
        try {
            const payment = await this.razorpay.payments.fetch(paymentId);
            return payment as unknown as Record<string, unknown>;
        } catch (error) {
            logger.error('Failed to fetch payment', {
                paymentId,
                error: error instanceof Error ? error.message : String(error),
            });
            throw new HttpException(500, 'Failed to fetch payment details.');
        }
    }

    // ============================================
    // REFUND OPERATIONS
    // ============================================

    /**
     * Create a refund for a payment
     *
     * @param paymentId - Razorpay payment ID (pay_xxxxx)
     * @param options - Refund options
     * @returns Razorpay refund object
     */
    async createRefund(
        paymentId: string,
        options?: CreateRefundOptions
    ): Promise<RazorpayRefundResponse> {
        try {
            const refund = await this.razorpay.payments.refund(paymentId, {
                amount: options?.amount,
                speed: options?.speed || 'normal',
                notes: options?.notes || {},
                receipt: options?.receipt,
            });

            logger.info('Razorpay refund created', {
                refundId: refund.id,
                paymentId,
                amount: refund.amount,
                status: refund.status,
            });

            return refund as RazorpayRefundResponse;
        } catch (error) {
            logger.error('Failed to create refund', {
                paymentId,
                error: error instanceof Error ? error.message : String(error),
            });
            throw new HttpException(500, 'Failed to process refund. Please try again.');
        }
    }

    /**
     * Fetch refund details
     */
    async getRefund(paymentId: string, refundId: string): Promise<RazorpayRefundResponse> {
        try {
            const refund = await this.razorpay.payments.fetchRefund(paymentId, refundId);
            return refund as RazorpayRefundResponse;
        } catch (error) {
            logger.error('Failed to fetch refund', {
                paymentId,
                refundId,
                error: error instanceof Error ? error.message : String(error),
            });
            throw new HttpException(500, 'Failed to fetch refund details.');
        }
    }

    // ============================================
    // SIGNATURE VERIFICATION
    // ============================================

    /**
     * Verify payment signature from Razorpay checkout callback
     *
     * Uses timing-safe comparison to prevent timing attacks.
     *
     * @param orderId - Razorpay order ID (order_xxxxx)
     * @param paymentId - Razorpay payment ID (pay_xxxxx)
     * @param signature - Signature from callback
     * @returns boolean - True if signature is valid
     */
    verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
        // Input validation
        if (!orderId || !paymentId || !signature) {
            logger.warn('Missing parameters for payment signature verification', {
                hasOrderId: !!orderId,
                hasPaymentId: !!paymentId,
                hasSignature: !!signature,
            });
            return false;
        }

        try {
            // Construct the message: order_id|payment_id
            const message = `${orderId}|${paymentId}`;

            // Generate expected signature using HMAC SHA256
            const expectedSignature = crypto
                .createHmac('sha256', this.keySecret)
                .update(message)
                .digest('hex');

            // Use timing-safe comparison to prevent timing attacks
            const isValid = crypto.timingSafeEqual(
                Buffer.from(expectedSignature, 'hex'),
                Buffer.from(signature, 'hex')
            );

            if (!isValid) {
                logger.warn('Payment signature verification failed', {
                    orderId,
                    paymentId,
                    expectedPrefix: expectedSignature.substring(0, 10) + '...',
                    actualPrefix: signature.substring(0, 10) + '...',
                });
            }

            return isValid;
        } catch (error) {
            // Buffer length mismatch or other error
            logger.warn('Payment signature verification error', {
                orderId,
                paymentId,
                error: error instanceof Error ? error.message : String(error),
            });
            return false;
        }
    }

    /**
     * Verify refund signature
     *
     * @param paymentId - Razorpay payment ID
     * @param refundId - Razorpay refund ID
     * @param signature - Signature to verify
     * @returns boolean - True if valid
     */
    verifyRefundSignature(paymentId: string, refundId: string, signature: string): boolean {
        if (!paymentId || !refundId || !signature) {
            return false;
        }

        try {
            const message = `${paymentId}|${refundId}`;
            const expectedSignature = crypto
                .createHmac('sha256', this.keySecret)
                .update(message)
                .digest('hex');

            return crypto.timingSafeEqual(
                Buffer.from(expectedSignature, 'hex'),
                Buffer.from(signature, 'hex')
            );
        } catch {
            return false;
        }
    }

    /**
     * Verify webhook signature
     *
     * IMPORTANT: Must use the RAW request body (before JSON parsing)
     *
     * @param rawBody - Raw request body as string
     * @param signature - x-razorpay-signature header value
     * @returns boolean - True if signature is valid
     */
    verifyWebhookSignature(rawBody: string, signature: string): boolean {
        if (!rawBody || !signature) {
            logger.warn('Missing parameters for webhook signature verification');
            return false;
        }

        try {
            const expectedSignature = crypto
                .createHmac('sha256', this.webhookSecret)
                .update(rawBody)
                .digest('hex');

            const isValid = crypto.timingSafeEqual(
                Buffer.from(expectedSignature, 'hex'),
                Buffer.from(signature, 'hex')
            );

            if (!isValid) {
                logger.warn('Webhook signature verification failed');
            }

            return isValid;
        } catch (error) {
            logger.warn('Webhook signature verification error', {
                error: error instanceof Error ? error.message : String(error),
            });
            return false;
        }
    }
}

// Export singleton instance
export const RazorpayService = new RazorpayServiceClass();

// Also export class for testing
export { RazorpayServiceClass };
