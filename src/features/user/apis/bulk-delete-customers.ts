/**
 * DELETE /api/users/bulk
 * Bulk delete users by IDs
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { inArray } from 'drizzle-orm';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth, requirePermission, validationMiddleware } from '../../../middlewares';
import { ResponseFormatter, uuidSchema, HttpException, logger } from '../../../utils';
import { db } from '../../../database';
import { users } from '../shared/user.schema';

// Validation Schema
const bulkDeleteSchema = z.object({
  ids: z.array(uuidSchema).min(1, 'At least one ID is required')
});

type BulkDeleteDto = z.infer<typeof bulkDeleteSchema>;

const handler = async (req: RequestWithUser, res: Response) => {
  const data: BulkDeleteDto = req.body;

  logger.info(`Bulk deleting users: ${data.ids.length} records`);

  try {
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

  } catch (error: any) {
    logger.error('Bulk delete failed:', error);
    console.error('BULK DELETE ERROR:', error);
    throw new HttpException(500, error.message || 'Failed to delete users');
  }
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
