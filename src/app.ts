import express from 'express';
import hpp from 'hpp';
import compression from 'compression';
import { authRateLimit, apiRateLimit } from './middlewares';
import { requestIdMiddleware } from './middlewares';
import { securityMiddleware } from './middlewares';
import { corsMiddleware } from './middlewares';
import { requestLoggerMiddleware } from './middlewares';
import { auditMiddleware } from './middlewares';
import type { Route as Routes } from './interfaces';
import { errorMiddleware } from './middlewares';
import { logger } from './utils';
import { config } from './utils/validateEnv';
import { checkDatabaseHealth } from './database';
import { isRedisReady } from './utils';
import { isProduction } from './utils/validateEnv';

class App {
  public app: express.Application;
  public port: number;
  public env: string;

  constructor(routes: Routes[]) {
    // Initialize the express app
    this.app = express();
    this.port = config.PORT;
    this.env = config.NODE_ENV;

    this.initializeMiddlewares();
    this.initializeRoutes(routes);
    this.initializeErrorHandling();

    this.app.get('/', (req, res) => {
      res.send('Welcome to Anant Enterprises Backend API');
    });

    // Health check endpoint with dependency status
    this.app.get('/health', async (req, res) => {
      try {
        // Check database health
        const dbHealth = await checkDatabaseHealth();
        const redisHealthy = isRedisReady();

        const isHealthy = dbHealth.status === 'healthy';

        res.status(isHealthy ? 200 : 503).json({
          status: isHealthy ? 'healthy' : 'degraded',
          timestamp: new Date().toISOString(),
          environment: this.env,
          uptime: process.uptime(),
          memory: {
            used: Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100,
            total: Math.round((process.memoryUsage().heapTotal / 1024 / 1024) * 100) / 100,
          },
          version: '1.0.0',
          dependencies: {
            database: {
              status: dbHealth.status,
              poolStats: dbHealth.details.poolStats,
            },
            redis: {
              status: redisHealthy ? 'healthy' : 'unavailable',
            },
          },
        });
      } catch {
        res.status(503).json({
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: 'Health check failed',
        });
      }
    });
  }

  public listen() {
    const port = Number(this.port);
    const server = this.app.listen(port, '0.0.0.0', () => {
      logger.info(
        `🚀 Anant Enterprises Backend API listening on port ${port}. Environment: ${this.env}.`
      );
    });

    // Configure server timeouts to prevent resource exhaustion
    server.timeout = 30000; // 30 seconds request timeout
    server.keepAliveTimeout = 65000; // Slightly higher than ALB default (60s)
    server.headersTimeout = 66000; // Slightly higher than keepAliveTimeout

    return server;
  }

  public getServer() {
    return this.app;
  }

  private initializeMiddlewares() {
    // Request ID middleware (must be first)
    this.app.use(requestIdMiddleware);

    // Security middlewares
    this.app.use(securityMiddleware);
    this.app.use(corsMiddleware);
    this.app.use(hpp());

    // Logging middleware
    this.app.use(requestLoggerMiddleware);

    // Compression
    this.app.use(compression());

    // Rate limiting - ENABLED ONLY IN PRODUCTION
    if (isProduction) {
      // Strict rate limiting for authentication endpoints
      this.app.use('/api/v1/auth/login', authRateLimit);
      this.app.use('/api/v1/auth/register', authRateLimit);
      this.app.use('/api/v1/auth/refresh-token', authRateLimit);

      // Moderate rate limiting for all other API endpoints
      this.app.use('/api/v1', apiRateLimit);

      logger.info('🔒 Rate limiting enabled for production environment');
    } else {
      logger.info('⚠️ Rate limiting disabled for development/test environment');
    }

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ limit: '10mb', extended: true }));

    // Audit logging (after body parsing, captures request body)
    this.app.use(auditMiddleware);
  }

  private initializeRoutes(routes: Routes[]) {
    // Routes now handle auth individually with requireAuth
    routes.forEach(route => {
      this.app.use('/api/', route.router);
    });
  }

  private initializeErrorHandling() {
    this.app.use(errorMiddleware);
  }
}

export default App;
