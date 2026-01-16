
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
import { connectWithRetry, pool } from './database';
import { redisClient, testRedisConnection } from './utils';
import { isProduction } from './utils/validateEnv';
import { setupGracefulShutdown } from './utils/gracefulShutdown';
import { initializeDiscountCron } from './features/discount/cron/discount-status-updater';

let server: import('http').Server;

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
      new CartRoute(),      // Cart endpoints
      new WishlistRoute(),  // Wishlist endpoints
      new OrdersRoute(),    // Orders endpoints
      new ReviewRoute(),    // Reviews endpoints
      new PaymentsRoute(),  // Payment/Razorpay endpoints
      new WebhooksRoute(),  // External webhook endpoints
      new TagRoute(),       // Tags master table
      new TierRoute(),      // Tiers feature
      new DiscountRoute(),  // Discount endpoints
      new ProfileRoute(),   // Profile settings and preferences
      new BlogRoute(),      // Blog endpoints
      new InventoryRoute(), // Inventory management endpoints
    ]);

    // Initialize Cron Jobs
    initializeDiscountCron();

    // Phase 2: Start cart reservation cleanup (every 5 minutes)
    if (process.env.NODE_ENV !== 'test') {
      const { startCartReservationCleanup } = await import('./jobs/cleanup-expired-reservations');
      startCartReservationCleanup();
    }


    server = app.listen();

    // Setup graceful shutdown with resources
    setupGracefulShutdown({
      server,
      database: pool,
      redis: redisClient,
    });

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
