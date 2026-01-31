import request from 'supertest';
import express from 'express';

// Mock dependencies
jest.mock('@/utils', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  db: {}, // Mocked below
}));

jest.mock('@/features/payments/services/razorpay.service', () => ({
  RazorpayService: {
    verifyWebhookSignature: jest.fn(),
  },
}));

jest.mock('@/database', () => ({
  db: {
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    onConflictDoUpdate: jest.fn().mockReturnThis(),
    returning: jest.fn(),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    limit: jest.fn(),
    transaction: jest.fn(cb =>
      cb({
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
      })
    ),
  },
}));

describe('Payment Webhook Edge Case Integration Tests', () => {
  let app: express.Application;
  let razorpayServiceMock: any;
  let dbMock: any;

  beforeAll(async () => {
    app = express();
    // Add raw body parser mock middleware if needed, or rely on what's in app setup
    // Since we import the router directly, we need to handle body parsing.
    // The webhook handler expects `req.rawBody`.
    app.use(express.json());
    app.use((req, res, next) => {
      (req as any).rawBody = JSON.stringify(req.body);
      next();
    });

    const { RazorpayService } = await import('@/features/payments/services/razorpay.service');
    razorpayServiceMock = RazorpayService;

    const { db } = await import('@/database');
    dbMock = db;

    const { default: webhookRouter } = await import('@/features/payments/apis/webhook-handler');
    app.use('/api/webhooks/razorpay', webhookRouter);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/webhooks/razorpay', () => {
    it('should return 401 if signature is missing', async () => {
      await request(app)
        .post('/api/webhooks/razorpay')
        .send({ event: 'payment.captured' })
        .expect(401);
    });

    it('should return 401 if signature is invalid', async () => {
      razorpayServiceMock.verifyWebhookSignature.mockReturnValue(false);

      // Mock DB for logging (it logs even on failure usually, or tries to)
      dbMock.returning.mockResolvedValue([{ id: 'log_1', processed: false }]);

      await request(app)
        .post('/api/webhooks/razorpay')
        .set('x-razorpay-signature', 'invalid_sig')
        .send({ event: 'payment.captured' })
        .expect(401);
    });

    it('should return 200 (already processed) for duplicate events', async () => {
      razorpayServiceMock.verifyWebhookSignature.mockReturnValue(true);

      // key is mock returning processed: true
      dbMock.returning.mockResolvedValue([{ id: 'log_1', processed: true }]);

      await request(app)
        .post('/api/webhooks/razorpay')
        .set('x-razorpay-signature', 'valid_sig')
        .send({
          event: 'payment.captured',
          payload: { payment: { entity: { id: 'pay_123', order_id: 'order_123' } } },
        })
        .expect(200)
        .expect(res => {
          expect(res.body.status).toBe('already_processed');
        });
    });

    it('should return 200 and process event if valid and new', async () => {
      razorpayServiceMock.verifyWebhookSignature.mockReturnValue(true);

      // 1. Log insertion returns new log
      dbMock.returning.mockResolvedValue([{ id: 'log_2', processed: false }]);

      // 2. Transaction lookup for payment.captured
      dbMock.limit.mockResolvedValue([
        {
          id: 'txn_1',
          order_id: 'order_1',
          status: 'initiated',
          amount: '500.00',
        },
      ]);

      // 3. Mock valid payload
      const payload = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_123',
              order_id: 'order_123',
              amount: 50000,
              method: 'card',
            },
          },
        },
      };

      await request(app)
        .post('/api/webhooks/razorpay')
        .set('x-razorpay-signature', 'valid_sig')
        .send(payload)
        .expect(200)
        .expect(res => {
          expect(res.body.status).toBe('success');
        });
    });
  });
});
