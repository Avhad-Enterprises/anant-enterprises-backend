/**
 * GET /api/admin/queue/queues
 * Get health status of all queues
 * Admin-only access
 */

import { Router, Response } from 'express';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth, requirePermission } from '../../../middlewares';
import { ResponseFormatter } from '../../../utils';
import { queueService } from '../services/queue.service';

const handler = async (req: RequestWithUser, res: Response) => {
    // Get health status for all queues
    const queuesHealth = await queueService.getQueueHealth();

    ResponseFormatter.success(
        res,
        { queues: queuesHealth },
        'Queue health retrieved successfully'
    );
};

const router = Router();
router.get(
    '/',
    requireAuth,
    requirePermission('queue:read'),
    handler
);

export default router;
