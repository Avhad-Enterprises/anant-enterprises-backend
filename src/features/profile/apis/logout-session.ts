/**
 * POST /api/profile/sessions/logout
 * Revoke sessions
 * - If scope='all', revokes all user sessions (signs out from all devices)
 * - If scope='current', just returns success (frontend handles clearing)
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth } from '../../../middlewares';
import { ResponseFormatter, HttpException } from '../../../utils';
import { supabase } from '../../../utils/supabase';
import { db } from '../../../database';
import { users } from '../../user/shared/user.schema';
import { eq } from 'drizzle-orm';

const logoutSessionSchema = z.object({
  sessionId: z.string().optional(),
  scope: z.enum(['current', 'all', 'others']).default('current'),
});

const handler = async (req: RequestWithUser, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    throw new HttpException(401, 'Authentication required');
  }

  const { scope } = logoutSessionSchema.parse(req.body);

  if (scope === 'all') {
    // Lookup proper auth_id from users table
    const [user] = await db
      .select({ auth_id: users.auth_id })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user || !user.auth_id) {
      throw new HttpException(404, 'User not found or not linked to authentication provider');
    }

    // Sign out user from all devices (revokes refresh tokens)
    const { error } = await supabase.auth.admin.signOut(user.auth_id);

    if (error) {
      throw new HttpException(500, `Failed to revoke sessions: ${error.message}`);
    }

    return ResponseFormatter.success(res, null, 'All sessions revoked successfully');
  }

  // logic for 'others' is not possible without tracking sessions
  if (scope === 'others') {
    return ResponseFormatter.success(res, null, 'Revoking other sessions is not supported without session tracking. Please use "Log out everywhere".');
  }

  // scope === 'current': Backend doesn't need to do anything for stateless JWT/Supabase
  // Frontend clears the token.
  ResponseFormatter.success(res, null, 'Logged out successfully');
};

const router = Router();
router.post('/sessions/logout', requireAuth, handler);

export default router;
