/**
 * GET /api/admin/queue/queues/:name
 * Get detailed status of a specific queue
 * Admin-only access
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth, requirePermission, validationMiddleware } from '../../../middlewares';
import { ResponseFormatter } from '../../../utils';
import { queueService } from '../services/queue.service';

// Validation schema for route params
const paramsSchema = z.object({
    name: z.string().min(1),
});

const handler = async (req: RequestWithUser, res: Response) => {
    const { name } = req.params;

    // Get queue health
    const health = await queueService.getQueueHealthByName(name);

    ResponseFormatter.success(
        res,
        { queue: health },
        `Queue ${name} status retrieved successfully`
    );
};

const router = Router();
router.get(
    '/:name',
    requireAuth,
    requirePermission('queue:read'),
    validationMiddleware(paramsSchema, 'params'),
    handler
);

export default router;
