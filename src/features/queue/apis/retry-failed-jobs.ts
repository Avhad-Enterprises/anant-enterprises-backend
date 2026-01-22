/**
 * POST /api/admin/queue/queues/:name/retry
 * Retry all failed jobs in a queue
 * Admin-only access
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth, requirePermission, validationMiddleware } from '../../../middlewares';
import { ResponseFormatter } from '../../../utils';
import { queueService } from '../services/queue.service';
import { auditService, AuditAction, AuditResourceType } from '../../audit';

// Validation schema
const paramsSchema = z.object({
    name: z.string().min(1),
});

const handler = async (req: RequestWithUser, res: Response) => {
    const { name } = req.params;
    const userId = req.userId;

    // Retry all failed jobs
    await queueService.retryFailedJobs(name);

    // Create audit log
    await auditService.log({
        action: AuditAction.UPDATE,
        resourceType: AuditResourceType.SYSTEM,
        userId,
        metadata: {
            operation: 'retry_failed_jobs',
            queueName: name,
        },
    });

    ResponseFormatter.success(
        res,
        { queue: name },
        `Failed jobs in ${name} queue are being retried`
    );
};

const router = Router();
router.post(
    '/:name/retry',
    requireAuth,
    requirePermission('queue:write'),
    validationMiddleware(paramsSchema, 'params'),
    handler
);

export default router;
