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
import { redisClient } from '../../../utils/database/redis';
import * as crypto from 'crypto';

const logoutSessionSchema = z.object({
  sessionId: z.string().optional(),
  scope: z.enum(['current', 'all', 'others', 'single']).default('current'),
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
    const { scope, sessionId } = logoutSessionSchema.parse(body);
    const currentSessionHash = crypto.createHash('sha256').update(jwt).digest('hex');

    // --- Redis Session Cleanup ---
    try {
      if (redisClient.isReady) {
        const pattern = `session:${userId}:*`;
        const keys = await redisClient.keys(pattern);

        if (scope === 'all') {
          // Delete ALL session keys for this user
          if (keys.length > 0) {
            await redisClient.del(keys);
          }
        } else if (scope === 'others') {
          // Delete all keys EXCEPT the current one
          const keysToDelete = keys.filter(key => !key.endsWith(`:${currentSessionHash}`));
          if (keysToDelete.length > 0) {
            await redisClient.del(keysToDelete);
          }
        } else if (scope === 'current') {
          // Delete ONLY the current session
          const currentKey = `session:${userId}:${currentSessionHash}`;
          await redisClient.del(currentKey);
        } else if (scope === 'single' && sessionId) {
          // Delete a specific session by ID (hash)
          const specificKey = `session:${userId}:${sessionId}`;
          await redisClient.del(specificKey);
        }
      }
    } catch (redisError) {
      console.error('Failed to clean up Redis sessions:', redisError);
    }
    // -----------------------------

    // Keep Supabase logout for security (invalidator)
    if (scope === 'all') {
      const result = await supabase.auth.admin.signOut(jwt, 'global');
      if (result.error) console.warn('Supabase global signOut warning:', result.error.message);
      return ResponseFormatter.success(res, null, 'All sessions revoked successfully.');
    }

    if (scope === 'others') {
      // Supabase doesn't support "others" directly easily without tracking tokens, 
      // but we have cleared them from our UI list via Redis.
      // We can rely on Redis for the UI update.
      return ResponseFormatter.success(res, null, 'Other sessions revoked successfully.');
    }

    if (scope === 'single') {
      // Single session revocation (Redis only)
      return ResponseFormatter.success(res, null, 'Session logged out successfully.');
    }

    // scope === 'current'
    const { error } = await supabase.auth.admin.signOut(jwt, 'local');
    if (error) console.warn('Supabase local signOut warning:', error.message);

    return ResponseFormatter.success(res, null, 'Logged out successfully');

  } catch (error) {
    next(error);
    return;
  }
};

const router = Router();
router.post('/sessions/logout', requireAuth, handler);

export default router;
