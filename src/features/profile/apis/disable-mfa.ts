/**
 * DELETE /api/profile/mfa/:factorId
 * Disable MFA
 * - Deletes the specified authentication factor
 */

import { Router, Response } from 'express';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth } from '../../../middlewares';
import { ResponseFormatter, HttpException } from '../../../utils';
import { supabase } from '../../../utils/supabase';
import { db } from '../../../database';
import { users } from '../../user/shared/user.schema';
import { eq } from 'drizzle-orm';

const handler = async (req: RequestWithUser, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    throw new HttpException(401, 'Authentication required');
  }

  const factorId = req.params.factorId as string;
  if (!factorId) {
    throw new HttpException(400, 'Factor ID is required');
  }

  // Lookup proper auth_id from users table
  const [user] = await db
    .select({ auth_id: users.auth_id })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user || !user.auth_id) {
    throw new HttpException(404, 'User not found or not linked to authentication provider');
  }

  try {
    const { error } = await supabase.auth.admin.mfa.deleteFactor({
      userId: user.auth_id,
      id: factorId,
    });

    if (error) {
      throw new HttpException(400, error.message);
    }

    ResponseFormatter.success(res, null, 'MFA disabled successfully');

  } catch (error: any) {
    throw new HttpException(500, error.message || 'Failed to disable MFA');
  }
};

const router = Router();
router.delete('/mfa/:factorId', requireAuth, handler);

export default router;
