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
import { redisClient } from '../../../utils/database/redis';
import * as crypto from 'crypto';

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

  // 2. Construct Active Sessions (Redis-backed)
  const userAgent = req.headers['user-agent'] || 'Unknown';
  const clientIP = req.ip || req.connection.remoteAddress || 'Unknown IP';

  // Get current session hash to identify "Current"
  const authHeader = req.headers['authorization'];
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : '';
  const currentSessionHash = token ? crypto.createHash('sha256').update(token).digest('hex') : null;

  const activeSessions: any[] = [];

  try {
    if (redisClient.isReady) {
      // Scan for user sessions
      const pattern = `session:${req.userId}:*`;
      const keys = await redisClient.keys(pattern);

      if (keys.length > 0) {
        // Fetch all session data
        const sessionsData = await Promise.all(keys.map(key => redisClient.get(key)));

        sessionsData.forEach((data, index) => {
          if (!data) return;
          try {
            const session = JSON.parse(data);
            const key = keys[index];
            const sessionHash = key.split(':').pop();

            // Parse UA
            const ua = session.userAgent || '';
            const isMobile = /mobile/i.test(ua);
            const deviceType = isMobile ? 'Mobile' : 'Desktop';
            const browser = /chrome/i.test(ua) ? 'Chrome' : /firefox/i.test(ua) ? 'Firefox' : /safari/i.test(ua) ? 'Safari' : /edge/i.test(ua) ? 'Edge' : 'Browser';

            // Format IP
            const loc = session.ip === '::1' ? 'Localhost' : session.ip;

            activeSessions.push({
              id: sessionHash || `sess-${index}`,
              device: `${browser} on ${deviceType}`,
              location: loc,
              lastActive: new Date(session.lastActive).toLocaleString(), // Better formatting needed? Using simple for now
              isCurrent: sessionHash === currentSessionHash
            });
          } catch (e) {
            console.error('Error parsing session data', e);
          }
        });
      }
    }
  } catch (redisError) {
    console.error('Error fetching sessions from Redis:', redisError);
  }



  // Helper to determine device info from UA for fallback/current login
  const isMobile = /mobile/i.test(userAgent);
  const deviceType = isMobile ? 'Mobile' : 'Desktop';
  const browser = /chrome/i.test(userAgent) ? 'Chrome' : /firefox/i.test(userAgent) ? 'Firefox' : /safari/i.test(userAgent) ? 'Safari' : /edge/i.test(userAgent) ? 'Edge' : 'Browser';

  // Fallback: If Redis is empty or failed, show current (mocked) to avoid empty list
  if (activeSessions.length === 0) {
    activeSessions.push({
      id: 'current-session',
      device: `${browser} on ${deviceType}`,
      location: clientIP === '::1' ? 'Localhost' : clientIP,
      lastActive: 'Now',
      isCurrent: true,
    });
  } else {
    // Sort: Current first, then by date desc
    activeSessions.sort((a, b) => {
      if (a.isCurrent) return -1;
      if (b.isCurrent) return 1;
      return new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime();
    });
  }

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
    activeSessions: activeSessions,
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

