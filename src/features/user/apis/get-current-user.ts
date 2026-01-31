/**
 * GET /api/users/me
 * Get current authenticated user's profile
 * - Returns the user based on the authenticated user's ID from the JWT token
 * - No permissions required (users can always view their own profile)
 */

import { Router, Response } from 'express';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth } from '../../../middlewares';
import { ResponseFormatter } from '../../../utils';
import { sanitizeUser } from '../shared/sanitizeUser';
import { HttpException } from '../../../utils';
import { findUserById } from '../shared/queries';
import { IUser } from '../shared/interface';

async function getCurrentUser(id: string): Promise<IUser> {
  const user = await findUserById(id);

  if (!user) {
    throw new HttpException(404, 'User not found');
  }

  return user as IUser;
}

const handler = async (req: RequestWithUser, res: Response) => {
  // Get the authenticated user's ID from the JWT token (set by requireAuth middleware)
  if (!req.userId) {
    throw new HttpException(401, 'Authentication required');
  }

  const user = await getCurrentUser(req.userId);
  console.log('DEBUG: getCurrentUser found user:', JSON.stringify(user, null, 2));

  if (user) {
    console.log('DEBUG: User has last_name?', 'last_name' in user, user.last_name);
  }

  const userResponse = sanitizeUser(user);
  console.log('DEBUG: Sanitized user response:', JSON.stringify(userResponse, null, 2));

  ResponseFormatter.success(res, userResponse, 'User retrieved successfully');
};

const router = Router();
router.get('/me', requireAuth, handler);

export default router;
