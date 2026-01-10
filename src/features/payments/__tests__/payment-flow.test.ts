/**
 * Payment Flow Integration Tests
 *
 * Tests the complete payment flow from order creation to verification.
 * Uses mocked database and Razorpay SDK.
 */

/* eslint-disable @typescript-eslint/no-require-imports */
import request from 'supertest';
import express from 'express';
import crypto from 'crypto';

// Test constants
const TEST_ORDER_ID = '550e8400-e29b-41d4-a716-446655440000';
const TEST_USER_ID = '660e8400-e29b-41d4-a716-446655440001';
const TEST_RAZORPAY_ORDER_ID = 'order_test123456';
const TEST_RAZORPAY_PAYMENT_ID = 'pay_test789012';
const KEY_SECRET = 'test_secret_key_1234567890';

// Mock modules before imports
jest.mock('../../../utils/validateEnv', () => ({
    config: {
        RAZORPAY_KEY_ID: 'rzp_test_1234567890',
        RAZORPAY_KEY_SECRET: KEY_SECRET,
        RAZORPAY_WEBHOOK_SECRET: 'webhook_secret_1234567890',
        NODE_ENV: 'test',
    },
}));

jest.mock('../../../utils', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
    },
    HttpException: class HttpException extends Error {
        constructor(public status: number, message: string, public details?: unknown) {
            super(message);
        }
    },
    ResponseFormatter: {
        success: jest.fn((res, data, message, status = 200) => {
            res.status(status).json({ success: true, data, message });
        }),
        error: jest.fn((res, message, status = 500) => {
            res.status(status).json({ success: false, message });
        }),
    },
    isRedisReady: jest.fn().mockReturnValue(false),
}));

// Mock database
const mockOrder = {
    id: TEST_ORDER_ID,
    user_id: TEST_USER_ID,
    order_number: 'ORD-2026-001',
    total_amount: '500.00',
    currency: 'INR',
    payment_status: 'pending',
    order_status: 'pending',
    payment_attempts: 0,
    is_deleted: false,
    created_at: new Date(),
};

const mockTransaction = {
    id: '770e8400-e29b-41d4-a716-446655440002',
    order_id: TEST_ORDER_ID,
    razorpay_order_id: TEST_RAZORPAY_ORDER_ID,
    amount: '500.00',
    status: 'initiated',
    created_at: new Date(),
};

jest.mock('../../../database', () => ({
    db: {
        select: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockOrder]),
        insert: jest.fn().mockReturnThis(),
        values: jest.fn().mockResolvedValue([mockTransaction]),
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        query: {
            paymentTransactions: {
                findFirst: jest.fn().mockResolvedValue(null),
            },
        },
    },
}));

// Mock Razorpay SDK
jest.mock('razorpay', () => {
    return jest.fn().mockImplementation(() => ({
        orders: {
            create: jest.fn().mockResolvedValue({
                id: TEST_RAZORPAY_ORDER_ID,
                entity: 'order',
                amount: 50000,
                currency: 'INR',
                receipt: TEST_ORDER_ID,
                status: 'created',
            }),
        },
        payments: {
            fetch: jest.fn().mockResolvedValue({
                id: TEST_RAZORPAY_PAYMENT_ID,
                status: 'captured',
            }),
        },
    }));
});

// Mock middleware
jest.mock('../../../middlewares', () => ({
    requireAuth: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
        (req as { userId?: string }).userId = TEST_USER_ID;
        next();
    },
    requirePermission: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));

describe('Payment Flow Integration Tests', () => {
    let app: express.Application;

    beforeAll(async () => {
        // Create test Express app
        app = express();
        app.use(express.json());

        // Import routes after mocks are set up
        const { default: createPaymentOrderRouter } = await import('../apis/create-payment-order');
        const { default: verifyPaymentRouter } = await import('../apis/verify-payment');

        app.use('/api/payments', createPaymentOrderRouter);
        app.use('/api/payments', verifyPaymentRouter);
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/payments/create-order', () => {
        it('should create a payment order for valid order', async () => {
            const response = await request(app)
                .post('/api/payments/create-order')
                .send({
                    order_id: TEST_ORDER_ID,
                    payment_method: 'razorpay',
                })
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('razorpay_order_id');
            expect(response.body.data).toHaveProperty('razorpay_key_id');
            expect(response.body.data).toHaveProperty('amount');
        });

        it('should reject request with missing order_id', async () => {
            const response = await request(app)
                .post('/api/payments/create-order')
                .send({
                    payment_method: 'razorpay',
                })
                .expect(400);

            expect(response.body.success).toBeFalsy();
        });

        it('should reject request with invalid order_id format', async () => {
            const response = await request(app)
                .post('/api/payments/create-order')
                .send({
                    order_id: 'invalid-uuid',
                    payment_method: 'razorpay',
                })
                .expect(400);

            expect(response.body.success).toBeFalsy();
        });
    });

    describe('POST /api/payments/verify', () => {
        it('should verify valid payment signature', async () => {
            // Mock finding the transaction
            const { db } = require('../../../database');
            db.query.paymentTransactions.findFirst.mockResolvedValueOnce(mockTransaction);
            db.limit.mockResolvedValueOnce([mockOrder]);

            // Generate valid signature
            const message = `${TEST_RAZORPAY_ORDER_ID}|${TEST_RAZORPAY_PAYMENT_ID}`;
            const signature = crypto
                .createHmac('sha256', KEY_SECRET)
                .update(message)
                .digest('hex');

            const response = await request(app)
                .post('/api/payments/verify')
                .send({
                    razorpay_order_id: TEST_RAZORPAY_ORDER_ID,
                    razorpay_payment_id: TEST_RAZORPAY_PAYMENT_ID,
                    razorpay_signature: signature,
                })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('payment_status', 'paid');
        });

        it('should reject invalid signature', async () => {
            // Mock finding the transaction
            const { db } = require('../../../database');
            db.query.paymentTransactions.findFirst.mockResolvedValueOnce(mockTransaction);
            db.limit.mockResolvedValueOnce([mockOrder]);

            const response = await request(app)
                .post('/api/payments/verify')
                .send({
                    razorpay_order_id: TEST_RAZORPAY_ORDER_ID,
                    razorpay_payment_id: TEST_RAZORPAY_PAYMENT_ID,
                    razorpay_signature: 'invalid_signature_123',
                })
                .expect(400);

            expect(response.body.success).toBeFalsy();
        });

        it('should reject request with missing parameters', async () => {
            const response = await request(app)
                .post('/api/payments/verify')
                .send({
                    razorpay_order_id: TEST_RAZORPAY_ORDER_ID,
                    // Missing payment_id and signature
                })
                .expect(400);

            expect(response.body.success).toBeFalsy();
        });
    });
});

describe('Webhook Handler Integration Tests', () => {
    let app: express.Application;
    const WEBHOOK_SECRET = 'webhook_secret_1234567890';

    beforeAll(async () => {
        app = express();

        // Add raw body middleware
        app.use('/api/webhooks/razorpay', (req, _res, next) => {
            let rawBody = '';
            req.setEncoding('utf8');
            req.on('data', (chunk: string) => {
                rawBody += chunk;
            });
            req.on('end', () => {
                (req as express.Request & { rawBody: string }).rawBody = rawBody;
                try {
                    req.body = JSON.parse(rawBody);
                } catch {
                    req.body = {};
                }
                next();
            });
        });

        const { default: webhookHandler } = await import('../apis/webhook-handler');
        app.use('/api/webhooks/razorpay', webhookHandler);
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should reject webhook without signature', async () => {
        const response = await request(app)
            .post('/api/webhooks/razorpay')
            .send({ event: 'payment.captured' })
            .expect(401);

        expect(response.body.status).toBe('error');
    });

    it('should reject webhook with invalid signature', async () => {
        const payload = JSON.stringify({
            event: 'payment.captured',
            payload: { payment: { entity: { id: 'pay_123' } } },
        });

        const response = await request(app)
            .post('/api/webhooks/razorpay')
            .set('x-razorpay-signature', 'invalid_signature')
            .set('Content-Type', 'application/json')
            .send(payload)
            .expect(401);

        expect(response.body.status).toBe('error');
    });

    it('should accept webhook with valid signature', async () => {
        const payload = JSON.stringify({
            event: 'order.paid',
            payload: {
                order: {
                    entity: {
                        id: TEST_RAZORPAY_ORDER_ID,
                        amount_paid: 50000,
                        status: 'paid',
                    },
                },
            },
        });

        const signature = crypto
            .createHmac('sha256', WEBHOOK_SECRET)
            .update(payload)
            .digest('hex');

        // Mock database calls
        const { db } = require('../../../database');
        db.insert.mockReturnValue({ values: jest.fn().mockResolvedValue([]) });
        db.query.paymentWebhookLogs = {
            findFirst: jest.fn().mockResolvedValue(null),
        };
        db.limit.mockResolvedValue([{ ...mockOrder, razorpay_order_id: TEST_RAZORPAY_ORDER_ID }]);

        const response = await request(app)
            .post('/api/webhooks/razorpay')
            .set('x-razorpay-signature', signature)
            .set('Content-Type', 'application/json')
            .send(payload)
            .expect(200);

        expect(response.body.status).toBe('success');
    });
});
