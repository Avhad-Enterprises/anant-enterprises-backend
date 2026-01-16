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
import validationMiddleware from '../../../middlewares/validation.middleware';
import { ResponseFormatter, uuidSchema } from '../../../utils';
import { sanitizeUser } from '../shared/sanitizeUser';
import { HttpException } from '../../../utils';
import { findUserById } from '../shared/queries';
import { IUser } from '../shared/interface';

const paramsSchema = z.object({
  id: uuidSchema,
});

async function getUserById(id: string): Promise<IUser> {
  const user = await findUserById(id);

  if (!user) {
    throw new HttpException(404, 'User not found');
  }

  return user as IUser;
}

const handler = async (req: RequestWithUser, res: Response) => {
  // Get the ID from the URL params (validated by Zod)
  const { id } = req.params as { id: string };
  const requestedUserId = id;

  const user = await getUserById(requestedUserId);
  const userResponse = sanitizeUser(user);

  ResponseFormatter.success(res, userResponse, 'User retrieved successfully');
};

const router = Router();
router.get(
  '/:id',
  requireAuth,
  validationMiddleware(paramsSchema, 'params'),
  requireOwnerOrPermission('id', 'users:read'),
  handler
);

export default router;
