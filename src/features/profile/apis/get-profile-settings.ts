/**
 * GET /api/profile/settings
 * Get current user's profile settings (UI preferences, localization, etc.)
 * - Returns settings for the authenticated user from the users table
 */

import { Router, Response } from 'express';
import { eq } from 'drizzle-orm';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth } from '../../../middlewares';
import { ResponseFormatter, HttpException } from '../../../utils';
import { db } from '../../../database';
import { users } from '../../user/shared/user.schema';

const handler = async (req: RequestWithUser, res: Response) => {
  if (!req.userId) {
    throw new HttpException(401, 'Authentication required');
  }

  // Get user settings from the users table
  const [user] = await db
    .select({
      timezone: users.timezone,
      preferred_language: users.preferred_language,
      preferred_currency: users.preferred_currency,
    })
    .from(users)
    .where(eq(users.id, req.userId))
    .limit(1);

  if (!user) {
    throw new HttpException(404, 'User not found');
  }

  // Return settings in the expected format
  const settings = {
    timezone: user.timezone,
    preferred_language: user.preferred_language,
    date_time_format: 'MM/DD/YYYY', // Default, can be added to users table if needed
    theme: 'light',
    density: 'comfortable',
    default_landing_page: 'Dashboard',
    rows_per_page: 25,
    remember_filters: true,
  };

  ResponseFormatter.success(res, settings, 'Profile settings retrieved successfully');
};

const router = Router();
router.get('/settings', requireAuth, handler);

export default router;
