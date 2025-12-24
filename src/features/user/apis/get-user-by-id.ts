/**
 * GET /api/users/:id
 * Get user by ID
 * - Users can view their own profile
 * - Users with users:read permission can view any profile
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth } from '../../../middlewares';
import { requireOwnerOrPermission } from '../../../middlewares';
import { validationMiddleware } from '../../../middlewares';
import { ResponseFormatter } from '../../../utils';
import { asyncHandler, parseIdParam } from '../../../utils';
import { sanitizeUser } from '../../../utils';
import { HttpException } from '../../../utils';
import { findUserById } from '../shared/queries';
import { IUser } from '../shared/interface';

const paramsSchema = z.object({
  id: z.coerce.number().int().positive('User ID must be a positive integer'),
});

async function getUserById(id: number): Promise<IUser> {
  const user = await findUserById(id);

  if (!user) {
    throw new HttpException(404, 'User not found');
  }

  return user as IUser;
}

const handler = asyncHandler(async (req: RequestWithUser, res: Response) => {
  const id = parseIdParam(req);
  const user = await getUserById(id);
  const userResponse = sanitizeUser(user);

  ResponseFormatter.success(res, userResponse, 'User retrieved successfully');
});

const router = Router();
router.get(
  '/:id',
  requireAuth,
  validationMiddleware(paramsSchema, 'params'),
  requireOwnerOrPermission('id', 'users:read'),
  handler
);

export default router;
