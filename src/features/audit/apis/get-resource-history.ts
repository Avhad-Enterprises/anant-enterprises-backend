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
import { ResponseFormatter } from '../../../utils';
import { auditService } from '../services/audit.service';
import { AuditResourceType } from '../shared/interface';

// Validation schema for URL params
const paramsSchema = z.object({
  type: z.nativeEnum(AuditResourceType),
  id: z.string().min(1, 'Resource ID is required'),
});

// Validation schema for query params
const querySchema = z.object({
  limit: z
    .preprocess(
      val => (val ? Number(val) : 100),
      z.number().int().min(1, 'Limit must be at least 1').max(1000, 'Limit must not exceed 1000')
    )
    .optional(),
});

const handler = async (req: RequestWithUser, res: Response) => {
  const type = req.params.type as AuditResourceType;
  const id = req.params.id; // Now a string (UUID)
  const { limit = 100 } = req.query as unknown as z.infer<typeof querySchema>;

  // Get audit trail for resource
  const history = await auditService.getAuditTrail(type, id, limit);

  ResponseFormatter.success(
    res,
    {
      resourceType: type,
      resourceId: id,
      history,
      count: history.length,
    },
    'Resource history retrieved successfully'
  );
};

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
