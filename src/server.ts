import App from './app';
import { logger } from './utils';
import UserRoute from './features/user';
import AuthRoute from './features/auth';
import UploadRoute from './features/upload';
import AdminInviteRoute from './features/admin-invite';
import ChatbotRoute from './features/chatbot';
import RBACRoute from './features/rbac';
import AuditRoute from './features/audit';
import QueueRoute from './features/queue';
import { connectWithRetry, pool } from './database';
import { redisClient, testRedisConnection } from './utils';
import { setupGracefulShutdown } from './utils/gracefulShutdown';
import { startWorkers, stopWorkers } from './features/queue';
import { config } from './utils/validateEnv';

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
      new UploadRoute(),
      new AdminInviteRoute(),
      new ChatbotRoute(),
      new RBACRoute(),
      new AuditRoute(), // Audit admin endpoints
      new QueueRoute(), // Queue admin endpoints
    ]);

    server = app.listen();

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
    process.exit(1); // Stop if critical services fail
  }
}

bootstrap();
