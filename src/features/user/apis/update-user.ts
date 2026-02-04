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
import validationMiddleware from '../../../middlewares/validation.middleware';
import { ResponseFormatter, shortTextSchema, emailSchema, uuidSchema, logger } from '../../../utils';
import { sanitizeUser } from '../shared/sanitizeUser';
import { HttpException } from '../../../utils';
import { db } from '../../../database';
import { users } from '../shared/user.schema';
import { IUser } from '../shared/interface';
import { findUserById, findUserByEmail } from '../shared/queries';

const updateUserSchema = z.object({
  first_name: shortTextSchema.optional(),
  last_name: shortTextSchema.optional().or(z.literal('')),
  display_name: z.string().max(100).optional(), // Allow empty string
  email: emailSchema.optional(),
  secondary_email: emailSchema.optional().or(z.literal('')),
  phone_number: z.string().optional(),
  secondary_phone_number: z.string().optional().or(z.literal('')),
  timezone: z.string().max(100).optional(),
  preferred_language: z.string().max(50).optional(),
  preferred_currency: z.string().max(50).optional(),
  user_type: z.enum(['individual', 'business']).optional(),
  date_of_birth: z.string().datetime().or(z.string()).optional().nullable(),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional(),
  profile_image_url: z.string().url().optional(),
});

type UpdateUser = z.infer<typeof updateUserSchema>;
async function updateUser(id: string, data: UpdateUser, requesterId: string): Promise<IUser> {
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

  // Map 'name' to 'first_name' for database compatibility
  const updateData: Partial<IUser> = {
    ...data,
    updated_by: requesterId,
  };

  logger.info('[updateUser] Final updateData:', updateData);

  const [result] = await db
    .update(users)
    .set({
      ...updateData,
      updated_at: new Date(),
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
    id: uuidSchema,
  });

  const { id } = paramsSchema.parse(req.params);
  const updateData: UpdateUser = req.body;

  const user = await updateUser(id, updateData, userId);

  // Invalidate cache for updated user
  await userCacheService.invalidateUser(user.id, user.email);

  const userResponse = sanitizeUser(user);

  ResponseFormatter.success(res, userResponse, 'User updated successfully');
};

const meHandler = async (req: RequestWithUser, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    throw new HttpException(401, 'User authentication required');
  }

  const updateData: UpdateUser = req.body;

  // Update SELF
  const user = await updateUser(userId, updateData, userId);

  // Invalidate cache
  await userCacheService.invalidateUser(user.id, user.email);

  const userResponse = sanitizeUser(user);

  ResponseFormatter.success(res, userResponse, 'Profile updated successfully');
};

const router = Router();

const paramsSchema = z.object({
  id: uuidSchema,
});

// Specific routes first
router.put('/me', requireAuth, validationMiddleware(updateUserSchema), meHandler);

// Dynamic routes second
router.put(
  '/:id',
  requireAuth,
  validationMiddleware(updateUserSchema),
  validationMiddleware(paramsSchema, 'params'),
  handler
);

export default router;

