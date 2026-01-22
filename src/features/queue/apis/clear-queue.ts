/**
 * DELETE /api/admin/queue/queues/:name
 * Clear all jobs from a queue
 * Admin-only access - DANGEROUS OPERATION
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

    // Clear the queue
    await queueService.clearQueue(name);

    // Create audit log for this critical operation
    await auditService.log({
        action: AuditAction.DELETE,
        resourceType: AuditResourceType.SYSTEM,
        userId,
        metadata: {
            operation: 'clear_queue',
            queueName: name,
            warning: 'All jobs were removed from the queue',
        },
    });

    ResponseFormatter.success(
        res,
        { queue: name },
        `Queue ${name} has been cleared successfully`
    );
};

const router = Router();
router.delete(
    '/:name',
    requireAuth,
    requirePermission('queue:delete'),
    validationMiddleware(paramsSchema, 'params'),
    handler
);

export default router;
