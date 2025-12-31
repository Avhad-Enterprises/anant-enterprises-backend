/**
 * GET /api/admin/invitations
 * Get all invitations with filtering and pagination (Admin only)
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../../middlewares';
import { requirePermission } from '../../../middlewares';
import { validationMiddleware } from '../../../middlewares';
import { ResponseFormatter } from '../../../utils';
import { getInvitations } from '../shared/queries';
import { InvitationStatus, invitationStatuses } from '../shared/schema';
import { IInvitation } from '../shared/interface';

const querySchema = z.object({
  status: z.enum(invitationStatuses).optional(),
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
});

type QueryParams = z.infer<typeof querySchema>;

async function handleGetInvitations(
  filters: { status?: InvitationStatus },
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
  const query: QueryParams = req.query;
  const result = await handleGetInvitations(
    { status: query.status },
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
