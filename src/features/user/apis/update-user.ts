/**
 * PUT /api/users/:id
 * Update user
 * - Users can update their own profile (name, email, phone)
 * - Users with users:update permission can update any user
 * 
 * NOTE: Password updates are handled via password reset flow
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth } from '../../../middlewares';
import { rbacCacheService } from '../../rbac';
import { userCacheService } from '../services/user-cache.service';
import { validationMiddleware } from '../../../middlewares';
import { ResponseFormatter } from '../../../utils';
import { sanitizeUser } from '../shared/sanitizeUser';
import { HttpException } from '../../../utils';
import { db } from '../../../database';
import { users } from '../shared/schema';
import { IUser } from '../shared/interface';
import { findUserById, findUserByEmail } from '../shared/queries';

const updateUserSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  email: z.string().email('Invalid email format').optional(),
  phone_number: z.string().optional(),
});

type UpdateUser = z.infer<typeof updateUserSchema>;

async function updateUser(
  id: number,
  data: UpdateUser,
  requesterId: number
): Promise<IUser> {
  const existingUser = await findUserById(id);

  if (!existingUser) {
    throw new HttpException(404, 'User not found');
  }

  const isOwnProfile = id === requesterId;

  // Check permissions for updating other users
  if (!isOwnProfile) {
    const canUpdateOthers = await rbacCacheService.hasPermission(requesterId, 'users:update');
    if (!canUpdateOthers) {
      throw new HttpException(403, 'You can only update your own profile');
    }
  }

  // Check email uniqueness
  if (data.email && data.email !== existingUser.email) {
    const existingUserWithEmail = await findUserByEmail(data.email);

    if (existingUserWithEmail && existingUserWithEmail.id !== id) {
      throw new HttpException(409, 'Email already exists');
    }
  }

  const updateData: Partial<IUser> = {
    ...data,
    updated_by: requesterId
  };

  const [result] = await db
    .update(users)
    .set({
      ...updateData,
      updated_at: new Date()
    })
    .where(eq(users.id, id))
    .returning();

  if (!result) {
    throw new HttpException(500, 'Failed to update user');
  }

  return result as IUser;
}

const handler = async (req: RequestWithUser, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    throw new HttpException(401, 'User authentication required');
  }

  const paramsSchema = z.object({
    id: z.coerce.number().int().positive('User ID must be a positive integer'),
  });

  const { id } = paramsSchema.parse(req.params);
  const updateData: UpdateUser = req.body;

  const user = await updateUser(id, updateData, userId);

  // Invalidate cache for updated user
  await userCacheService.invalidateUser(user.id, user.email);

  const userResponse = sanitizeUser(user);

  ResponseFormatter.success(res, userResponse, 'User updated successfully');
};

const router = Router();

const paramsSchema = z.object({
  id: z.coerce.number().int().positive('User ID must be a positive integer'),
});

router.put('/:id', requireAuth, validationMiddleware(updateUserSchema), validationMiddleware(paramsSchema, 'params'), handler);

export default router;
