/**
 * GET /api/profile/security
 * Get current user's security information
 * - Returns active sessions and recent login history
 */

import { Router, Response } from 'express';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth } from '../../../middlewares';
import { ResponseFormatter, HttpException } from '../../../utils';
import { ISecuritySettings } from '../shared/interface';
import { supabase } from '../../../utils/supabase';
import { db } from '../../../database';
import { users } from '../../user/shared/user.schema';
import { eq } from 'drizzle-orm';

const handler = async (req: RequestWithUser, res: Response) => {
  if (!req.userId) {
    throw new HttpException(401, 'Authentication required');
  }

  // Lookup proper auth_id from users table
  const [user] = await db
    .select({
      auth_id: users.auth_id,
      email: users.email,
      last_login: users.updated_at // Using updated_at as proxy for last login since we don't have last_login column
    })
    .from(users)
    .where(eq(users.id, req.userId))
    .limit(1);

  if (!user || !user.auth_id) {
    throw new HttpException(404, 'User not found');
  }

  // 1. Fetch MFA Factors
  let twoFactorEnabled = false;
  let twoFactorMethod = undefined;
  let twoFactorId = undefined;
  let lastVerified = undefined;

  try {
    const { data: factors, error } = await supabase.auth.admin.mfa.listFactors({
      userId: user.auth_id
    });

    if (error) {
      console.warn('Error fetching factors:', error);
    }

    if (factors && factors.factors) {
      const verifiedFactor = factors.factors.find(f => f.status === 'verified' && f.factor_type === 'totp');
      if (verifiedFactor) {
        twoFactorEnabled = true;
        twoFactorMethod = 'Authenticator App';
        twoFactorId = verifiedFactor.id;
        lastVerified = new Date(verifiedFactor.updated_at).toLocaleDateString();
      }
    }
  } catch (error) {
    console.warn('Failed to fetch MFA factors:', error);
  }

  // 2. Construct Active Sessions (Current Session only)
  // Since we can't persist sessions, we show the current one derived from request
  const userAgent = req.headers['user-agent'] || 'Unknown';
  const clientIP = req.ip || req.connection.remoteAddress || 'Unknown IP';

  // Simple heuristic for device info
  const isMobile = /mobile/i.test(userAgent);
  const deviceType = isMobile ? 'Mobile' : 'Desktop';
  const browser = /chrome/i.test(userAgent) ? 'Chrome' : /firefox/i.test(userAgent) ? 'Firefox' : /safari/i.test(userAgent) ? 'Safari' : 'Browser';

  const currentSession = {
    id: 'current-session',
    device: `${browser} on ${deviceType}`,
    location: clientIP === '::1' ? 'Localhost' : clientIP, // Simple IP display
    lastActive: 'Now',
    isCurrent: true,
  };

  // 3. Construct Login History (Mock/Proxy)
  // We'll show the current successful access as the latest history entry
  const recentLogin = {
    timestamp: new Date(),
    ip_address: clientIP,
    location: clientIP === '::1' ? 'Localhost' : 'Unknown',
    device_type: deviceType,
    browser: browser,
  };

  const securitySettings: ISecuritySettings = {
    activeSessions: [currentSession],
    loginHistory: [recentLogin],
    passwordLastChanged: 'Not available', // Supabase doesn't expose this easily
    twoFactorEnabled,
    twoFactorId,
    twoFactorMethod,
    lastVerified: lastVerified ? lastVerified : undefined,
  };

  ResponseFormatter.success(res, securitySettings, 'Security settings retrieved successfully');
};

const router = Router();
router.get('/security', requireAuth, handler);

export default router;

