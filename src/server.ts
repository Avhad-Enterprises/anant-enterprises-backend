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
import { connectWithRetry, pool } from './database';
import { redisClient, testRedisConnection } from './utils';
import { setupGracefulShutdown } from './utils/gracefulShutdown';

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
    ]);

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
    process.exit(1); // Stop if critical services fail
  }
}

bootstrap();
