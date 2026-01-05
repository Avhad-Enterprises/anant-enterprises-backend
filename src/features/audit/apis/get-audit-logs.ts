/**
 * GET /api/admin/audit/logs
 * Get audit logs with advanced filtering and pagination
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
import { AuditAction, AuditResourceType, AuditLogFilters } from '../shared/interface';

// Validation schema for query parameters
const querySchema = z.object({
  userId: z.string().optional(),
  action: z.string().optional(),
  resourceType: z.nativeEnum(AuditResourceType).optional(),
  resourceId: z.union([z.coerce.number().int(), z.string()]).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  ipAddress: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(500).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const handler = async (req: RequestWithUser, res: Response) => {
  // Validation middleware ensures these are the correct types
  const filters: AuditLogFilters = {
    limit: req.query.limit ? Number(req.query.limit) : 50,
    offset: req.query.offset ? Number(req.query.offset) : 0,
  };

  if (req.query.userId) filters.userId = String(req.query.userId);
  if (req.query.resourceType) filters.resourceType = req.query.resourceType as AuditResourceType;
  if (req.query.resourceId) filters.resourceId = String(req.query.resourceId);
  if (req.query.startDate) filters.startDate = new Date(req.query.startDate as string);
  if (req.query.endDate) filters.endDate = new Date(req.query.endDate as string);
  if (req.query.ipAddress) filters.ipAddress = String(req.query.ipAddress);

  // Handle multiple actions (comma-separated)
  if (req.query.action) {
    const actionStr = req.query.action as string;
    const actions = actionStr.split(',').map((a: string) => a.trim());
    filters.action =
      actions.length === 1 ? (actions[0] as AuditAction) : (actions as AuditAction[]);
  }

  // Query audit logs
  const logs = await auditService.queryLogs(filters);

  ResponseFormatter.success(
    res,
    {
      logs,
      pagination: {
        limit: filters.limit,
        offset: filters.offset,
        count: logs.length,
      },
    },
    'Audit logs retrieved successfully'
  );
};

const router = Router();
router.get(
  '/',
  requireAuth,
  requirePermission('audit:read'),
  validationMiddleware(querySchema, 'query'),
  handler
);

export default router;
