/**
 * GET /api/admin/audit/resource/:type/:id
 * Get complete audit history for a specific resource
 * Admin-only access
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth } from '../../../middlewares';
import { requirePermission } from '../../../middlewares';
import { validationMiddleware } from '../../../middlewares';
import { asyncHandler } from '../../../utils';
import { ResponseFormatter } from '../../../utils';
import { auditService } from '../services/audit.service';
import { AuditResourceType } from '../shared/types';

// Validation schema for URL params
const paramsSchema = z.object({
    type: z.nativeEnum(AuditResourceType),
    id: z.coerce.number().int().positive('Resource ID must be a positive integer'),
});

// Validation schema for query params
const querySchema = z.object({
    limit: z.coerce.number().int().min(1).max(1000).default(100),
});


const handler = asyncHandler(async (req: RequestWithUser, res: Response) => {
    const type = req.params.type as AuditResourceType;
    const id = parseInt(req.params.id, 10);
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;

    // Get audit trail for resource
    const history = await auditService.getAuditTrail(type, id, limit);

    ResponseFormatter.success(res, {
        resourceType: type,
        resourceId: id,
        history,
        count: history.length,
    }, 'Resource history retrieved successfully');
});

const router = Router();
router.get(
    '/:type/:id',
    requireAuth,
    requirePermission('audit:read'),
    validationMiddleware(paramsSchema, 'params'),
    validationMiddleware(querySchema, 'query'),
    handler
);

export default router;
