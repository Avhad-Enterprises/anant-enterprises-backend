/**
 * POST /api/profile/sessions/logout
 * Revoke sessions using Supabase Admin API
 * - If scope='all', revokes all user sessions globally (signs out from all devices)
 * - If scope='current', just returns success (frontend handles clearing)
 */

import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth } from '../../../middlewares';
import { ResponseFormatter, HttpException } from '../../../utils';
import { supabase } from '../../../utils/supabase';

const logoutSessionSchema = z.object({
  sessionId: z.string().optional(),
  scope: z.enum(['current', 'all', 'others']).default('current'),
});

const handler = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    if (!userId) {
      throw new HttpException(401, 'Authentication required');
    }

    // Get the JWT from the Authorization header (already validated by requireAuth)
    const authHeader = req.headers.authorization;
    const jwt = authHeader?.replace('Bearer ', '');

    if (!jwt) {
      throw new HttpException(401, 'No valid session token found');
    }

    const body = req.body || {};
    const { scope } = logoutSessionSchema.parse(body);

    if (scope === 'all') {
      // Use Supabase Admin API to sign out user globally
      // This revokes all refresh tokens, forcing re-login on all devices
      // when their current access token expires
      console.log(`[logout-session] Attempting global signOut for user ${userId}`);
      console.log(`[logout-session] JWT length: ${jwt.length}, starts with: ${jwt.substring(0, 20)}...`);

      const result = await supabase.auth.admin.signOut(jwt, 'global');

      console.log(`[logout-session] Supabase signOut result:`, JSON.stringify(result, null, 2));

      if (result.error) {
        console.error('[logout-session] Supabase signOut error:', result.error);
        throw new HttpException(500, `Failed to revoke sessions: ${result.error.message}`);
      }

      console.log(`[logout-session] User ${userId} logged out from all sessions globally - SUCCESS`);
      return ResponseFormatter.success(res, null, 'All sessions revoked successfully. Please log in again on all devices.');
    }

    if (scope === 'others') {
      // Sign out from other devices, keep current session
      const { error } = await supabase.auth.admin.signOut(jwt, 'others');

      if (error) {
        console.error('[logout-session] Supabase signOut others error:', error);
        throw new HttpException(500, `Failed to revoke other sessions: ${error.message}`);
      }

      console.log(`[logout-session] User ${userId} logged out from other sessions`);
      return ResponseFormatter.success(res, null, 'Other sessions revoked successfully.');
    }

    // scope === 'current': Sign out current session only
    const { error } = await supabase.auth.admin.signOut(jwt, 'local');

    if (error) {
      console.error('[logout-session] Supabase signOut local error:', error);
      // Don't throw - frontend will still clear local tokens
    }

    return ResponseFormatter.success(res, null, 'Logged out successfully');
  } catch (error) {
    next(error);
    return;
  }
};

const router = Router();
router.post('/sessions/logout', requireAuth, handler);

export default router;
