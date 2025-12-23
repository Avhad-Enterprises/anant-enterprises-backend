/**
 * DELETE /api/users/:id
 * Soft delete user (Admin only)
 * - Prevents self-deletion
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { RequestWithUser } from '../../../interfaces/request.interface';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { requirePermission } from '../../../middlewares/permission.middleware';
import validationMiddleware from '../../../middlewares/validation.middleware';
import { ResponseFormatter } from '../../../utils/responseFormatter';
import { asyncHandler, getUserId } from '../../../utils/controllerHelpers';
import HttpException from '../../../utils/httpException';
import { db } from '../../../database/drizzle';
import { users } from '../shared/schema';
import { findUserById } from '../shared/queries';
import { userCacheService } from '../services/user-cache.service';

const paramsSchema = z.object({
  id: z.coerce.number().int().positive('User ID must be a positive integer'),
});

async function deleteUser(id: number, deletedBy: number): Promise<{ email: string }> {
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
      deleted_by: deletedBy,
      deleted_at: new Date(),
    })
    .where(eq(users.id, id));

  return { email: existingUser.email };
}

const handler = asyncHandler(async (req: RequestWithUser, res: Response) => {
  const { id } = paramsSchema.parse(req.params);
  const userId = getUserId(req);

  const { email } = await deleteUser(id, userId);

  // Invalidate cache for deleted user
  await userCacheService.invalidateUser(id, email);

  ResponseFormatter.success(res, null, 'User deleted successfully');
});

const router = Router();
router.delete('/:id', requireAuth, requirePermission('users:delete'), validationMiddleware(paramsSchema, 'params'), handler);

export default router;
