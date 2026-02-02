/**
 * POST /api/auth/refresh-token
 * Refresh access token using Supabase Auth (Public - no auth)
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import validationMiddleware from '../../../middlewares/validation.middleware';
import { authRateLimit } from '../../../middlewares';
import { ResponseFormatter } from '../../../utils';
import { HttpException } from '../../../utils';
import { supabaseAnon } from '../../../utils/supabase';
import { db } from '../../../database';
import { users } from '../../user/shared/user.schema';
import { eq } from 'drizzle-orm';
import { shortTextSchema } from '../../../utils';

const schema = z.object({
  refreshToken: shortTextSchema,
});

export async function handleRefreshToken(refreshToken: string) {
  // Refresh session with Supabase Auth
  const { data: authData, error } = await supabaseAnon.auth.refreshSession({
    refresh_token: refreshToken,
  });

  if (error || !authData?.user || !authData?.session) {
    throw new HttpException(401, 'Invalid refresh token');
  }

  // Get the public.users record
  const publicUser = await db
    .select()
    .from(users)
    .where(eq(users.auth_id, authData.user.id))
    .limit(1);

  if (!publicUser[0]) {
    throw new HttpException(500, 'User sync failed');
  }

  return {
    user: {
      id: publicUser[0].id,
      auth_id: authData.user.id,
      first_name: publicUser[0].first_name,
      middle_name: publicUser[0].middle_name,
      last_name: publicUser[0].last_name,
      email: publicUser[0].email,
      phone_number: publicUser[0].phone_number || undefined,
      created_at: publicUser[0].created_at,
      updated_at: publicUser[0].updated_at,
    },
    token: authData.session.access_token,
    refreshToken: authData.session.refresh_token,
  };
}

const handler = async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  const result = await handleRefreshToken(refreshToken);
  ResponseFormatter.success(res, result, 'Token refreshed successfully');
};

const router = Router();
// No auth required - the refresh token itself is validated
// Rate limited to prevent abuse (same as auth endpoints)
router.post('/refresh-token', authRateLimit, validationMiddleware(schema), handler);

export default router;
