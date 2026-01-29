/**
 * GET /api/admin/invitations
 * Get all invitations with filtering and pagination (Admin only)
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../../middlewares';
import { requirePermission } from '../../../middlewares';
import validationMiddleware from '../../../middlewares/validation.middleware';
import { ResponseFormatter } from '../../../utils';
import { getInvitations } from '../shared/queries';
import { IInvitation } from '../shared/interface';

const querySchema = z.object({
  status: z.string().optional(),
  page: z
    .string()
    .transform(val => parseInt(val))
    .refine(val => val > 0, 'Page must be positive')
    .optional(),
  limit: z
    .string()
    .transform(val => parseInt(val))
    .refine(val => val > 0 && val <= 100, 'Limit must be between 1 and 100')
    .optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  roleId: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

type QueryParams = z.infer<typeof querySchema>;

async function handleGetInvitations(
  filters: { status?: string; startDate?: string; endDate?: string; roleId?: string; sortBy?: string; sortOrder?: 'asc' | 'desc' },
  pagination: { page?: number; limit?: number }
): Promise<{ invitations: IInvitation[]; total: number; page: number; limit: number }> {
  const result = await getInvitations(filters, pagination);
  const { page = 1, limit = 10 } = pagination;

  return {
    invitations: result.invitations as IInvitation[],
    total: result.total,
    page,
    limit,
  };
}

const handler = async (req: Request, res: Response): Promise<void> => {
  const query = req.query as unknown as QueryParams;
  const result = await handleGetInvitations(
    {
      status: query.status,
      startDate: query.startDate,
      endDate: query.endDate,
      roleId: query.roleId,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder
    },
    { page: query.page, limit: query.limit }
  );

  ResponseFormatter.success(res, result, 'Invitations retrieved successfully');
};

const router = Router();
router.get(
  '/',
  requireAuth,
  requirePermission('admin:invitations'),
  validationMiddleware(querySchema, 'query'),
  handler
);

export default router;
