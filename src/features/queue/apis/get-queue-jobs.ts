/**
 * GET /api/admin/queue/queues/:name/jobs
 * Get jobs from a specific queue with filtering
 * Admin-only access
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth, requirePermission, validationMiddleware } from '../../../middlewares';
import { ResponseFormatter } from '../../../utils';
import { queueService } from '../services/queue.service';

// Validation schemas
const paramsSchema = z.object({
    name: z.string().min(1),
});

const querySchema = z.object({
    status: z.enum(['waiting', 'active', 'completed', 'failed']).default('waiting'),
    start: z.coerce.number().int().min(0).default(0),
    end: z.coerce.number().int().min(0).max(100).default(50),
});

const handler = async (req: RequestWithUser, res: Response) => {
    const { name } = req.params;
    const { status, start, end } = req.query as unknown as { status: 'waiting' | 'active' | 'completed' | 'failed'; start: number; end: number };

    // Get jobs from queue
    const jobs = await queueService.getQueueJobs(name, status, start, end);

    ResponseFormatter.success(
        res,
        {
            queue: name,
            status,
            jobs,
            pagination: {
                start,
                end,
                count: jobs.length,
            },
        },
        `Jobs retrieved from ${name} queue successfully`
    );
};

const router = Router();
router.get(
    '/:name/jobs',
    requireAuth,
    requirePermission('queue:read'),
    validationMiddleware(paramsSchema, 'params'),
    validationMiddleware(querySchema, 'query'),
    handler
);

export default router;
