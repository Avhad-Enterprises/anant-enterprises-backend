import { NextFunction, Response, Request } from 'express';
import { HttpException } from '../utils';
import { logger } from '../utils';
import { verifySupabaseToken } from '../features/auth/services/supabase-auth.service';
import { db } from '../database';
import { users } from '../features/user/shared/user.schema';
import { eq } from 'drizzle-orm';

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
    const publicUser = await db.select().from(users).where(eq(users.auth_id, authUser.id)).limit(1);

    if (!publicUser[0]) {
      logger.warn('Authentication failed: User sync not found', {
        ip: clientIP,
        userAgent,
        url: req.originalUrl,
        method: req.method,
        authId: authUser.id,
      });
      return next(new HttpException(401, 'User not found'));
    }

    // Attach user information to request (use integer ID for RBAC)
    req.userId = publicUser[0].id;
    req.userAgent = userAgent;
    req.clientIP = clientIP;

    // Log successful authentication
    logger.info('Authentication successful', {
      userId: publicUser[0].id,
      authId: authUser.id,
      ip: clientIP,
      userAgent: userAgent.substring(0, 100), // Truncate for logging
      url: req.originalUrl,
      method: req.method,
    });

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

export default requireAuth;
