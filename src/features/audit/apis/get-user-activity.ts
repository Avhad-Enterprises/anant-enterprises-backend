/**
 * GET /api/admin/audit/user/:userId/activity
 * Get activity history for a specific user
 * Admin-only access (or user viewing their own activity)
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth } from '../../../middlewares';
import { requirePermission } from '../../../middlewares';
import { validationMiddleware } from '../../../middlewares';
import { ResponseFormatter } from '../../../utils';
import { auditService } from '../services/audit.service';

// Validation schema for URL params
const paramsSchema = z.object({
  userId: z.coerce.number().int().positive('User ID must be a positive integer'),
});

// Validation schema for query params
const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(1000).default(100),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

const handler = async (req: RequestWithUser, res: Response) => {
  const userId = parseInt(req.params.userId, 10);
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
  const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
  const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

  // Get user activity
  let activity = await auditService.getUserActivity(userId, limit);

  // Optional: Filter by date range
  if (startDate || endDate) {
    activity = activity.filter(log => {
      const logDate = new Date(log.timestamp);

      if (startDate && logDate < startDate) return false;
      if (endDate && logDate > endDate) return false;

      return true;
    });
  }

  ResponseFormatter.success(
    res,
    {
      userId,
      activity,
      count: activity.length,
    },
    'User activity retrieved successfully'
  );
};

const router = Router();
router.get(
  '/:userId/activity',
  requireAuth,
  requirePermission('audit:read'),
  validationMiddleware(paramsSchema, 'params'),
  validationMiddleware(querySchema, 'query'),
  handler
);

export default router;
