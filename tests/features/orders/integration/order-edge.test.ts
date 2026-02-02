import request from 'supertest';
import express from 'express';

const TEST_USER_ID = 'test-user-id';

// Mock dependencies
jest.mock('@/utils', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  ResponseFormatter: {
    success: jest.fn((res, data, message, status = 200) => {
      res.status(status).json({ success: true, data, message });
    }),
  },
  HttpException: class HttpException extends Error {
    constructor(
      public status: number,
      message: string
    ) {
      super(message);
    }
  },
}));

jest.mock('@/middlewares', () => ({
  requireAuth: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    (req as any).userId = TEST_USER_ID;
    next();
  },
}));

// Mock DB and other services to prevent actual calls
jest.mock('@/database', () => ({
  db: {
    transaction: jest.fn(),
    select: jest.fn(() => ({
      from: jest.fn(() => ({
        where: jest.fn(() => ({
          limit: jest.fn().mockResolvedValue([]), // No cart found
        })),
      })),
    })),
  },
}));

jest.mock('@/features/inventory/services/inventory.service', () => ({
  validateStockAvailability: jest.fn().mockResolvedValue([]),
  reserveStockForOrder: jest.fn().mockResolvedValue(true),
  extendCartReservation: jest.fn(),
}));

jest.mock('@/features/queue/services/event-publisher.service', () => ({
  eventPublisher: {
    publishNotification: jest.fn(),
    publishBatchNotification: jest.fn(),
  },
}));

describe('Order Edge Case Integration Tests', () => {
  let app: express.Application;

  beforeAll(async () => {
    app = express();
    app.use(express.json());

    // Import router
    const { default: createOrderRouter } = await import('@/features/orders/apis/create-order');
    app.use('/api/orders', createOrderRouter);
  });

  describe('POST /api/orders', () => {
    it('should reject order creation with negative quantity', async () => {
      const payload = {
        items: [
          {
            product_id: '550e8400-e29b-41d4-a716-446655440000',
            quantity: -5,
            cost_price: 100,
            line_total: 500,
          },
        ],
        subtotal: '500',
        total_amount: '500',
      };

      await request(app).post('/api/orders').send(payload).expect(400); // Zod validation should fail
    });

    it('should reject order creation with empty items list for direct order', async () => {
      const payload = {
        items: [],
      };

      await request(app).post('/api/orders').send(payload).expect(400); // "No active cart found" or "Cart is empty"
    });
  });
});
