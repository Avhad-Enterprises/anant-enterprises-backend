/**
 * DELETE /api/users/bulk
 * Bulk delete users by IDs
 */

import { Router, Response } from 'express';

import { inArray } from 'drizzle-orm';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth, requirePermission, validationMiddleware } from '../../../middlewares';
import { ResponseFormatter, HttpException, logger } from '../../../utils';
import { db } from '../../../database';
import { users } from '../../user/shared/user.schema';
import { bulkDeleteSchema, BulkDeleteDto } from '../shared/validation';

const handler = async (req: RequestWithUser, res: Response) => {
  const data: BulkDeleteDto = req.body;

  logger.info(`Bulk deleting users: ${data.ids.length} records`);

  // Prevent deleting self
  if (req.userId && data.ids.includes(req.userId)) {
    throw new HttpException(400, 'Cannot delete your own account');
  }

  // Delete users - Soft Delete
  // Note: Related records (profiles, addresses) should be handled by ON DELETE CASCADE in database
  // or we need to delete them manually if not set up
  // Updating for Soft Delete as per request

  const result = await db.update(users)
    .set({
      is_deleted: true,
      deleted_at: new Date(),
      deleted_by: req.userId
    })
    .where(inArray(users.id, data.ids))
    .returning({ id: users.id });

  ResponseFormatter.success(res, {
    deleted_count: result.length,
    ids: result.map(u => u.id)
  }, `Successfully deleted ${result.length} users`);
};

const router = Router();

router.delete(
  '/bulk',
  requireAuth,
  requirePermission('users:delete'),
  validationMiddleware(bulkDeleteSchema),
  handler
);

export default router;
