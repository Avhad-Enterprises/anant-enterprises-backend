/**
 * DELETE /api/users/:id
 * Soft delete user (Admin only)
 * - Prevents self-deletion
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth } from '../../../middlewares';
import { requirePermission } from '../../../middlewares';
import { validationMiddleware } from '../../../middlewares';
import { ResponseFormatter } from '../../../utils';
import { HttpException } from '../../../utils';
import { db } from '../../../database';
import { users } from '../shared/user.schema';
import { findUserById } from '../shared/queries';
import { userCacheService } from '../services/user-cache.service';

const paramsSchema = z.object({
  id: z.string().uuid('User ID must be a valid UUID'),
});

async function deleteUser(id: string, deletedBy: string): Promise<{ email: string }> {
  // Prevent self-deletion
  if (id === deletedBy) {
    throw new HttpException(400, 'Cannot delete your own account');
  }

  const existingUser = await findUserById(id);
  if (!existingUser) {
    throw new HttpException(404, 'User not found');
  }

  await db
    .update(users)
    .set({
      is_deleted: true,
      deleted_by: null, // deleted_by is integer in schema, needs migration
      deleted_at: new Date(),
    })
    .where(eq(users.id, id));

  return { email: existingUser.email };
}

const handler = async (req: RequestWithUser, res: Response) => {
  const { id } = paramsSchema.parse(req.params);
  const userId = req.userId;
  if (!userId) {
    throw new HttpException(401, 'User authentication required');
  }

  const { email } = await deleteUser(id, userId);

  // Invalidate cache for deleted user
  await userCacheService.invalidateUser(id, email);

  ResponseFormatter.success(res, null, 'User deleted successfully');
};

const router = Router();
router.delete(
  '/:id',
  requireAuth,
  requirePermission('users:delete'),
  validationMiddleware(paramsSchema, 'params'),
  handler
);

export default router;
