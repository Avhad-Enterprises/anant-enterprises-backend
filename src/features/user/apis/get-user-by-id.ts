/**
 * GET /api/users/:id
 * Get user by ID (Requires auth)
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../../middlewares/auth.middleware';
import validationMiddleware from '../../../middlewares/validation.middleware';
import { ResponseFormatter } from '../../../utils/responseFormatter';
import { asyncHandler } from '../../../utils/controllerHelpers';
import { sanitizeUser } from '../../../utils/sanitizeUser';
import HttpException from '../../../utils/httpException';
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

const handler = asyncHandler(async (req: Request, res: Response) => {
  const { id } = paramsSchema.parse(req.params);
  const user = await getUserById(id);
  const userResponse = sanitizeUser(user);

  ResponseFormatter.success(res, userResponse, 'User retrieved successfully');
});

const router = Router();
router.get('/:id', requireAuth, validationMiddleware(paramsSchema, 'params'), handler);

export default router;
