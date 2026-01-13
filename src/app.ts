import express from 'express';
import hpp from 'hpp';
import compression from 'compression';
import { authRateLimit, apiRateLimit } from './middlewares';
import { requestIdMiddleware } from './middlewares';
import { securityMiddleware } from './middlewares';
import { corsMiddleware } from './middlewares';
import { requestLoggerMiddleware } from './middlewares';
import { sanitizeInput } from './middlewares'; // auditMiddleware removed as it's commented out
import type { Route as Routes } from './interfaces';
import { errorMiddleware } from './middlewares';
import { logger } from './utils';
import { config } from './utils/validateEnv';
import { checkDatabaseHealth } from './database';
import { isRedisReady } from './utils';

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
      const startTime = Date.now();
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
          responseTime: Date.now() - startTime,
          memory: {
            used: Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100,
            total: Math.round((process.memoryUsage().heapTotal / 1024 / 1024) * 100) / 100,
            percentage: Math.round((process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100),
          },
          version: '1.0.0',
          dependencies: {
            database: {
              status: dbHealth.status,
              poolStats: dbHealth.details.poolStats,
              latency: dbHealth.details.latency,
            },
            redis: {
              status: redisHealthy ? 'healthy' : 'unavailable',
            },
          },
        });
      } catch (error) {
        res.status(503).json({
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: 'Health check failed',
          responseTime: Date.now() - startTime,
        });
      }
    });
  }

  public listen() {
    const port = Number(this.port);
    const server = this.app.listen(port, '0.0.0.0', () => {
      logger.info(
        `🚀 Anant Enterprises Backend API listening on port ${port}.Environment: ${this.env}.`
      );
    });

    // Configure server timeouts to prevent resource exhaustion
    const requestTimeout = Number(process.env.REQUEST_TIMEOUT) || 30000;
    server.timeout = requestTimeout; // Configurable request timeout (default 30s)
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

    // Rate limiting - ENABLED (skips dev/test via middleware logic)
    this.app.use('/api/auth/login', authRateLimit);
    this.app.use('/api/auth/register', authRateLimit);
    this.app.use('/api/auth/refresh-token', authRateLimit);
    this.app.use('/api/', apiRateLimit);

    // Raw body capture for Razorpay webhooks (MUST be before express.json())
    // Signature verification requires the raw, unparsed body
    this.app.use(
      '/api/webhooks/razorpay',
      express.raw({
        type: 'application/json',
        limit: '1mb',
        verify: (req, res, buf) => {
          (req as express.Request & { rawBody: string }).rawBody = buf.toString('utf8');
        },
      }),
      (req, res, next) => {
        try {
          req.body = JSON.parse((req as express.Request & { rawBody: string }).rawBody);
        } catch {
          req.body = {};
        }
        next();
      }
    );

    // Body parsing (regular routes)
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ limit: '10mb', extended: true }));

    // Input sanitization (XSS protection) - runs BEFORE validation
    this.app.use(sanitizeInput);
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
