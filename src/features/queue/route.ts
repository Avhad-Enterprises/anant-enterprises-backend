/**
 * Queue Admin Routes
 *
 * All admin endpoints for managing and monitoring queues.
 * Requires authentication and specific permissions.
 *
 * Routes:
 * - GET    /api/admin/queue/queues           - List all queues with health status
 * - GET    /api/admin/queue/queues/:name     - Get specific queue status
 * - GET    /api/admin/queue/queues/:name/jobs - Get jobs from a queue
 * - POST   /api/admin/queue/queues/:name/retry - Retry failed jobs
 * - DELETE /api/admin/queue/queues/:name     - Clear all jobs from queue
 */

import { Router } from 'express';
import Route from '../../interfaces/route.interface';

/**
 * Queue Route Class
 * Follows the same pattern as AuditRoute, RBACRoute, etc.
 */
class QueueRoute implements Route {
    public path = '/admin/queue';
    public router = Router();

    constructor() {
        this.initializeRoutes();
    }

    private async initializeRoutes() {
        // Dynamic imports to avoid circular dependency
        const { default: getQueuesRouter } = await import('./apis/get-queues');
        const { default: getQueueStatusRouter } = await import('./apis/get-queue-status');
        const { default: getQueueJobsRouter } = await import('./apis/get-queue-jobs');
        const { default: retryFailedJobsRouter } = await import('./apis/retry-failed-jobs');
        const { default: clearQueueRouter } = await import('./apis/clear-queue');

        // Queue admin endpoints: /api/admin/queue/*
        this.router.use(`${this.path}/queues/:name/jobs`, getQueueJobsRouter);
        this.router.use(`${this.path}/queues/:name/retry`, retryFailedJobsRouter);
        this.router.use(`${this.path}/queues/:name`, clearQueueRouter);
        this.router.use(`${this.path}/queues/:name`, getQueueStatusRouter);
        this.router.use(`${this.path}/queues`, getQueuesRouter);
    }
}

export default QueueRoute;
