import App from './app';
import { logger } from './utils';
import UserRoute from './features/user';
import AuthRoute from './features/auth';
import ProductRoute from './features/product';
import CollectionRoute from './features/collection';
import UploadRoute from './features/upload';
import AdminInviteRoute from './features/admin-invite';
import ChatbotRoute from './features/chatbot';
import RBACRoute from './features/rbac';
import AuditRoute from './features/audit';
import BundleRoute from './features/bundles';
import CartRoute from './features/cart';
import WishlistRoute from './features/wishlist';
import OrdersRoute from './features/orders';
import ReviewRoute from './features/reviews';
import PaymentsRoute from './features/payments';
import WebhooksRoute from './features/webhooks';
import TagRoute from './features/tags';
import TierRoute from './features/tiers';
import DiscountRoute from './features/discount';
import ProfileRoute from './features/profile';
import BlogRoute from './features/blog';
import InventoryRoute from './features/inventory';
import DashboardRoute from './features/dashboard';
import QueueRoute from './features/queue';
import NotificationRoute from './features/notifications';
import InvoiceRoute from './features/invoice';
import { connectWithRetry, pool } from './database';
import { redisClient, testRedisConnection } from './utils';
import { isProduction } from './utils/validateEnv';
import { setupGracefulShutdown } from './utils/gracefulShutdown';
import { initializeDiscountCron } from './features/discount/jobs/discount-status-updater';
import { startWorkers, stopWorkers } from './features/queue';
import { config } from './utils/validateEnv';
import { socketService } from './features/notifications/socket/socket.service';
import { socketAuthMiddleware } from './features/notifications/socket/socket.middleware';

let server: import('http').Server;
let httpServer: import('http').Server;

async function bootstrap() {
  try {
    logger.info('🚀 Starting Express Backend...');

    // Connect to database with retry (useful in containerized environments)
    const dbConnected = await connectWithRetry(5, 1000);
    if (!dbConnected) {
      throw new Error('Failed to connect to database after multiple retries');
    }
    logger.info('✅ Database connected');

    // Initialize Redis connection
    const redisConnected = await testRedisConnection();
    if (!redisConnected) {
      if (isProduction) {
        throw new Error('Redis connection required in production environment');
      }
      logger.warn('⚠️ Redis not available - using in-memory caching as fallback');
    } else {
      logger.info('✅ Redis connected');
    }

    // Start Express app
    const app = new App([
      new AuthRoute(),
      new UserRoute(),
      new ProductRoute(),
      new CollectionRoute(),
      new UploadRoute(),
      new AdminInviteRoute(),
      new ChatbotRoute(),
      new RBACRoute(),
      new AuditRoute(), // Audit admin endpoints
      new BundleRoute(),
      new CartRoute(), // Cart endpoints
      new WishlistRoute(), // Wishlist endpoints
      new OrdersRoute(), // Orders endpoints
      new ReviewRoute(), // Reviews endpoints
      new PaymentsRoute(), // Payment/Razorpay endpoints
      new WebhooksRoute(), // External webhook endpoints
      new TagRoute(), // Tags master table
      new TierRoute(), // Tiers feature
      new DiscountRoute(), // Discount endpoints
      new ProfileRoute(), // Profile settings and preferences
      new BlogRoute(), // Blog endpoints
      new InventoryRoute(), // Inventory management endpoints
      new DashboardRoute(), // Dashboard statistics endpoints
      new QueueRoute(), // Queue admin endpoints
      new NotificationRoute(), // Notification endpoints (user + admin)
      new InvoiceRoute(), // Invoice management endpoints
    ]);

    // Initialize Cron Jobs
    initializeDiscountCron();

    // Phase 2: Start cart reservation cleanup (every 5 minutes)
    const { startCartReservationCleanup } = await import('./features/cart/jobs/cleanup-expired-reservations');
    startCartReservationCleanup();

    // Initialize async routes (ensures dynamic imports complete before server starts)
    await app.initializeAsyncRoutes();
    logger.info('✅ Async routes initialized');

    // Create HTTP server from Express app BEFORE initializing Socket.IO
    const http = await import('http');
    const expressApp = app.getServer();
    httpServer = http.createServer(expressApp);

    // Initialize Socket.IO for real-time notifications with authentication middleware
    try {
      socketService.initialize(httpServer, socketAuthMiddleware);
      logger.info('✅ Socket.IO initialized with authentication');
    } catch (error) {
      logger.error('Failed to initialize Socket.IO', { error });
      // Non-blocking: server continues without WebSocket support
    }

    // Start HTTP server listening
    server = httpServer.listen(config.PORT, '0.0.0.0', () => {
      logger.info(`🌐 Server running on port ${config.PORT}`);
      logger.info(`📍 Environment: ${isProduction ? 'production' : 'development'}`);
    });

    // Start queue workers if enabled
    if (config.QUEUE_WORKERS_ENABLED === 'true' && redisConnected) {
      try {
        await startWorkers();
      } catch (error) {
        logger.error('Failed to start queue workers', { error });
        logger.warn('⚠️ Server will continue without queue workers');
      }
    } else if (config.QUEUE_WORKERS_ENABLED === 'true' && !redisConnected) {
      logger.warn('⚠️ Queue workers require Redis - workers not started');
    }

    // Setup graceful shutdown with resources
    setupGracefulShutdown({
      server,
      database: pool,
      redis: redisClient,
    });

    // Custom shutdown handler for workers
    const originalSigterm = process.listeners('SIGTERM');
    const originalSigint = process.listeners('SIGINT');

    process.removeAllListeners('SIGTERM');
    process.removeAllListeners('SIGINT');

    const handleShutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down workers first...`);

      if (config.QUEUE_WORKERS_ENABLED === 'true') {
        try {
          await stopWorkers();
        } catch (error) {
          logger.error('Error stopping workers', { error });
        }
      }

      // Call original handlers
      if (signal === 'SIGTERM' && originalSigterm.length > 0) {
        await Promise.all(originalSigterm.map(fn => (fn as Function)(signal)));
      } else if (signal === 'SIGINT' && originalSigint.length > 0) {
        await Promise.all(originalSigint.map(fn => (fn as Function)(signal)));
      }
    };

    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));

    logger.info('✅ Express Backend started successfully!');
  } catch (error) {
    logger.error('App failed to start', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Perform cleanup before exit
    try {
      if (pool) {
        await pool.end();
        logger.info('✅ Database connections closed');
      }
      if (redisClient && redisClient.isOpen) {
        await redisClient.quit();
        logger.info('✅ Redis connection closed');
      }
    } catch (cleanupError) {
      logger.error('❌ Error during cleanup:', cleanupError);
    }

    process.exit(1);
  }
}

bootstrap();
