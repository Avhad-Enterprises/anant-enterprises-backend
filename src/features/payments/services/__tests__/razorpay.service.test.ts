/**
 * RazorpayService Unit Tests
 *
 * Tests for signature verification and service methods.
 * Uses mocked Razorpay SDK to avoid actual API calls.
 */

import crypto from 'crypto';

// Mock the config before importing the service
jest.mock('../../../utils/validateEnv', () => ({
    config: {
        RAZORPAY_KEY_ID: 'rzp_test_1234567890',
        RAZORPAY_KEY_SECRET: 'test_secret_key_1234567890',
        RAZORPAY_WEBHOOK_SECRET: 'webhook_secret_1234567890',
    },
}));

// Mock the logger
jest.mock('../../../utils', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
    },
    HttpException: class HttpException extends Error {
        constructor(public status: number, message: string) {
            super(message);
        }
    },
}));

// Mock Razorpay SDK
jest.mock('razorpay', () => {
    return jest.fn().mockImplementation(() => ({
        orders: {
            create: jest.fn().mockResolvedValue({
                id: 'order_test123',
                entity: 'order',
                amount: 50000,
                currency: 'INR',
                receipt: 'test-order-id',
                status: 'created',
            }),
            fetch: jest.fn().mockResolvedValue({
                id: 'order_test123',
                status: 'paid',
            }),
        },
        payments: {
            fetch: jest.fn().mockResolvedValue({
                id: 'pay_test123',
                status: 'captured',
            }),
            refund: jest.fn().mockResolvedValue({
                id: 'rfnd_test123',
                status: 'processed',
                amount: 50000,
            }),
        },
    }));
});

import { RazorpayServiceClass } from '../razorpay.service';

describe('RazorpayService', () => {
    let service: RazorpayServiceClass;
    const keySecret = 'test_secret_key_1234567890';
    const webhookSecret = 'webhook_secret_1234567890';

    beforeEach(() => {
        service = new RazorpayServiceClass();
    });

    describe('getKeyId', () => {
        it('should return the Razorpay key ID', () => {
            expect(service.getKeyId()).toBe('rzp_test_1234567890');
        });
    });

    describe('isTestMode', () => {
        it('should return true for test keys', () => {
            expect(service.isTestMode()).toBe(true);
        });
    });

    describe('verifyPaymentSignature', () => {
        it('should return true for valid signature', () => {
            const orderId = 'order_test123';
            const paymentId = 'pay_test456';

            // Generate valid signature
            const message = `${orderId}|${paymentId}`;
            const expectedSignature = crypto
                .createHmac('sha256', keySecret)
                .update(message)
                .digest('hex');

            const result = service.verifyPaymentSignature(orderId, paymentId, expectedSignature);

            expect(result).toBe(true);
        });

        it('should return false for invalid signature', () => {
            const orderId = 'order_test123';
            const paymentId = 'pay_test456';
            const invalidSignature = 'invalid_signature_123';

            const result = service.verifyPaymentSignature(orderId, paymentId, invalidSignature);

            expect(result).toBe(false);
        });

        it('should return false for tampered order ID', () => {
            const orderId = 'order_test123';
            const paymentId = 'pay_test456';

            // Generate signature with original order ID
            const message = `${orderId}|${paymentId}`;
            const signature = crypto
                .createHmac('sha256', keySecret)
                .update(message)
                .digest('hex');

            // Verify with tampered order ID
            const result = service.verifyPaymentSignature('order_tampered', paymentId, signature);

            expect(result).toBe(false);
        });

        it('should return false for missing parameters', () => {
            expect(service.verifyPaymentSignature('', 'pay_123', 'sig')).toBe(false);
            expect(service.verifyPaymentSignature('order_123', '', 'sig')).toBe(false);
            expect(service.verifyPaymentSignature('order_123', 'pay_123', '')).toBe(false);
        });

        it('should be timing-safe against timing attacks', () => {
            const orderId = 'order_test123';
            const paymentId = 'pay_test456';

            const message = `${orderId}|${paymentId}`;
            const validSignature = crypto
                .createHmac('sha256', keySecret)
                .update(message)
                .digest('hex');

            // Measure time for valid signature (multiple runs for averaging)
            const validTimes: number[] = [];
            for (let i = 0; i < 100; i++) {
                const start = process.hrtime.bigint();
                service.verifyPaymentSignature(orderId, paymentId, validSignature);
                const end = process.hrtime.bigint();
                validTimes.push(Number(end - start));
            }

            // Measure time for invalid signature with same length
            const invalidSignature = 'a'.repeat(64);
            const invalidTimes: number[] = [];
            for (let i = 0; i < 100; i++) {
                const start = process.hrtime.bigint();
                service.verifyPaymentSignature(orderId, paymentId, invalidSignature);
                const end = process.hrtime.bigint();
                invalidTimes.push(Number(end - start));
            }

            // Calculate averages
            const avgValid = validTimes.reduce((a, b) => a + b, 0) / validTimes.length;
            const avgInvalid = invalidTimes.reduce((a, b) => a + b, 0) / invalidTimes.length;

            // Times should be similar (within 50% variance)
            // This is a basic check - real timing attacks need more sophisticated analysis
            const ratio = Math.max(avgValid, avgInvalid) / Math.min(avgValid, avgInvalid);
            expect(ratio).toBeLessThan(2); // Should be close to 1
        });
    });

    describe('verifyWebhookSignature', () => {
        it('should return true for valid webhook signature', () => {
            const rawBody = JSON.stringify({
                event: 'payment.captured',
                payload: { payment: { entity: { id: 'pay_123' } } },
            });

            const signature = crypto
                .createHmac('sha256', webhookSecret)
                .update(rawBody)
                .digest('hex');

            const result = service.verifyWebhookSignature(rawBody, signature);

            expect(result).toBe(true);
        });

        it('should return false for invalid webhook signature', () => {
            const rawBody = JSON.stringify({ event: 'payment.captured' });
            const invalidSignature = 'invalid_webhook_signature';

            const result = service.verifyWebhookSignature(rawBody, invalidSignature);

            expect(result).toBe(false);
        });

        it('should return false for modified payload', () => {
            const originalBody = JSON.stringify({ event: 'payment.captured' });
            const modifiedBody = JSON.stringify({ event: 'payment.failed' });

            const signature = crypto
                .createHmac('sha256', webhookSecret)
                .update(originalBody)
                .digest('hex');

            const result = service.verifyWebhookSignature(modifiedBody, signature);

            expect(result).toBe(false);
        });

        it('should return false for missing parameters', () => {
            expect(service.verifyWebhookSignature('', 'sig')).toBe(false);
            expect(service.verifyWebhookSignature('body', '')).toBe(false);
        });
    });

    describe('verifyRefundSignature', () => {
        it('should return true for valid refund signature', () => {
            const paymentId = 'pay_test123';
            const refundId = 'rfnd_test456';

            const message = `${paymentId}|${refundId}`;
            const signature = crypto
                .createHmac('sha256', keySecret)
                .update(message)
                .digest('hex');

            const result = service.verifyRefundSignature(paymentId, refundId, signature);

            expect(result).toBe(true);
        });

        it('should return false for invalid refund signature', () => {
            const result = service.verifyRefundSignature('pay_123', 'rfnd_456', 'invalid');

            expect(result).toBe(false);
        });
    });

    describe('createOrder', () => {
        it('should create a Razorpay order', async () => {
            const result = await service.createOrder({
                amount: 50000,
                currency: 'INR',
                receipt: 'test-order-id',
            });

            expect(result).toHaveProperty('id', 'order_test123');
            expect(result).toHaveProperty('amount', 50000);
            expect(result).toHaveProperty('currency', 'INR');
        });
    });
});
