/**
 * GET /api/profile/notifications
 * Get current user's notification preferences
 * - Fetches from Supabase User Metadata (JSON) to avoid DB schema changes
 */

import { Router, Response } from 'express';
import { eq } from 'drizzle-orm';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth } from '../../../middlewares';
import { ResponseFormatter, HttpException } from '../../../utils';
import { db } from '../../../database';
import { users } from '../../user/shared/user.schema';
import { supabase } from '../../../utils/supabase';

const handler = async (req: RequestWithUser, res: Response) => {
  if (!req.userId) {
    throw new HttpException(401, 'Authentication required');
  }

  // 1. Get auth_id from users table
  const [user] = await db
    .select({ auth_id: users.auth_id })
    .from(users)
    .where(eq(users.id, req.userId))
    .limit(1);

  if (!user || !user.auth_id) {
    throw new HttpException(404, 'User not found');
  }

  // 2. Fetch User Metadata from Supabase
  const { data: { user: authUser }, error } = await supabase.auth.admin.getUserById(user.auth_id);

  if (error || !authUser) {
    throw new HttpException(500, 'Failed to retrieve notification settings');
  }

  // 3. Extract preferences from metadata or use defaults
  const meta = authUser.user_metadata || {};
  const prefs = meta.notifications || {};

  // Default values matching frontend
  const defaults = {
    push_notifications: true,
    email_notifications: true,
    sms_notifications: false,
    security_alerts: true,
    order_updates: true,
    product_updates: true,
    // stored as snake_case in metadata
  };

  const finalPrefs = { ...defaults, ...prefs };

  ResponseFormatter.success(res, finalPrefs, 'Notification preferences retrieved');
};

const router = Router();
router.get('/notifications', requireAuth, handler);

export default router;
