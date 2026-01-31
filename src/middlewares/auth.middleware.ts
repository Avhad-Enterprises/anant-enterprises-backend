import { NextFunction, Response, Request } from 'express';
import { HttpException } from '../utils';
import { logger } from '../utils';
import { verifySupabaseToken } from '../features/auth/services/supabase-auth.service';
import { db } from '../database';
import { users } from '../features/user/shared/user.schema';
import { customerProfiles } from '../features/user/shared/customer-profiles.schema';
import { eq } from 'drizzle-orm';
import * as crypto from 'crypto';
import { redisClient } from '../utils/database/redis';

/**
 * Authentication middleware - requires valid Supabase JWT token
 * Verifies the token and attaches the user ID (integer) to the request
 */
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers['authorization'];
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const clientIP = req.ip || req.connection?.remoteAddress || 'Unknown';

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('Authentication failed: Missing or invalid authorization header', {
        ip: clientIP,
        userAgent,
        url: req.originalUrl,
        method: req.method,
      });
      return next(new HttpException(401, 'Authentication required. No token provided.'));
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!token || token === 'null') {
      logger.warn('Authentication failed: Null token provided', {
        ip: clientIP,
        userAgent,
        url: req.originalUrl,
        method: req.method,
      });
      return next(new HttpException(401, 'Authentication required. No token provided.'));
    }

    // Verify Supabase JWT token
    const authUser = await verifySupabaseToken(token);

    if (!authUser) {
      logger.warn('Authentication failed: Invalid Supabase token', {
        ip: clientIP,
        userAgent,
        url: req.originalUrl,
        method: req.method,
      });
      return next(new HttpException(401, 'Invalid or expired token'));
    }

    // Get the public.users record via auth_id (UUID from Supabase)
    // Join with customer_profiles to check account status
    const result = await db
      .select({
        user: users,
        profile: customerProfiles
      })
      .from(users)
      .leftJoin(customerProfiles, eq(users.id, customerProfiles.user_id))
      .where(eq(users.auth_id, authUser.id))
      .limit(1);

    if (!result[0] || !result[0].user) {
      logger.warn('Authentication failed: User sync not found', {
        ip: clientIP,
        userAgent,
        url: req.originalUrl,
        method: req.method,
      });
      return next(new HttpException(401, 'User not found'));
    }

    const { user, profile } = result[0];

    // Check if user is soft-deleted
    if (user.is_deleted) {
      logger.warn('Authentication failed: User account is deleted', {
        ip: clientIP,
        userAgent,
        url: req.originalUrl,
        method: req.method,
      });
      return next(new HttpException(401, 'User account has been deleted'));
    }

    // Check customer profile status
    if (profile) {
      if (profile.account_status === 'closed') {
        logger.warn('Authentication failed: User account is closed/inactive', {
          ip: clientIP,
          userId: user.id,
          status: profile.account_status
        });
        return next(new HttpException(403, 'Your account is inactive. Please contact support.'));
      }

      if (profile.account_status === 'suspended') {
        logger.warn('Authentication failed: User account is suspended', {
          ip: clientIP,
          userId: user.id,
          status: profile.account_status
        });
        return next(new HttpException(403, 'Your account has been suspended. Please contact support.'));
      }
    }

    // Attach user information to request (use integer ID for RBAC)
    req.userId = user.id;
    req.userAgent = userAgent;
    req.clientIP = clientIP;

    // Log successful authentication
    logger.info('Authentication successful', {
      userId: user.id,
      ip: clientIP,
      userAgent: userAgent.substring(0, 100), // Truncate for logging
      url: req.originalUrl,
      method: req.method,
    });

    // --- Session Tracking (Redis) ---
    try {
      if (redisClient.isReady) {
        // Create a unique session ID based on the JWT signature (or whole token)
        // Using hash to keep keys short and secure
        const sessionHash = crypto.createHash('sha256').update(token).digest('hex');
        const sessionKey = `session:${req.userId}:${sessionHash}`;

        const sessionData = {
          ip: clientIP,
          userAgent: userAgent,
          lastActive: new Date().toISOString(),
          // We can add more metadata if needed
        };

        // Store session in Redis with 7 days expiry (refreshing TTL on activity)
        await redisClient.set(sessionKey, JSON.stringify(sessionData), { EX: 60 * 60 * 24 * 7 });
      }
    } catch (sessionError) {
      // Non-blocking error logging for session tracking
      logger.error('Failed to track session in Redis:', sessionError);
    }
    // --------------------------------

    next();
  } catch (error) {
    logger.error('Auth middleware error:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      ip: req.ip || req.connection?.remoteAddress || 'Unknown',
      userAgent: req.headers['user-agent'] || 'Unknown',
      url: req.originalUrl,
      method: req.method,
    });

    // If it's already an HttpException, pass it through
    if (error instanceof HttpException) {
      return next(error);
    }

    return next(new HttpException(500, 'Authentication error'));
  }
};

export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers['authorization'];

    // If no auth header, just continue as anonymous
    // The endpoint will handle the case of missing user
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!token || token === 'null') {
      return next();
    }

    // Verify Supabase JWT token
    const authUser = await verifySupabaseToken(token);

    if (!authUser) {
      // If token provided but invalid, we could either:
      // 1. Return 401 (strict)
      // 2. Continue as guest (permissive)
      // Choosing strict to help frontend detect expired sessions
      return next(new HttpException(401, 'Invalid or expired token'));
    }

    // Get the public.users record
    const result = await db
      .select({
        user: users,
        profile: customerProfiles
      })
      .from(users)
      .leftJoin(customerProfiles, eq(users.id, customerProfiles.user_id))
      .where(eq(users.auth_id, authUser.id))
      .limit(1);

    if (!result[0] || !result[0].user) {
      return next(new HttpException(401, 'User not found'));
    }

    const { user, profile } = result[0];

    if (user.is_deleted) {
      return next(new HttpException(401, 'User account has been deleted'));
    }

    // Check customer profile status
    if (profile) {
      if (profile.account_status === 'closed' || profile.account_status === 'suspended') {
        // Optional auth: treat as anonymous if account is closed/suspended?
        // Or fail? Usually, if you try to auth and are banned, you should probably be told you are banned.
        return next(new HttpException(403, 'Your account is inactive/suspended.'));
      }
    }

    // Attach user information
    req.userId = user.id;
    req.userAgent = req.headers['user-agent'] || 'Unknown';
    req.clientIP = req.ip || req.connection?.remoteAddress || 'Unknown';

    next();
  } catch (error) {
    // On error, we'll fail safe to 401 if a token was attempted but failed hard
    logger.warn('Optional auth error:', { error });
    return next(new HttpException(401, 'Authentication error'));
  }
};

export default requireAuth;
