import { Request } from 'express';

/**
 * Extended Request interfaces for type-safe middleware handling
 * 
 * Note: Base Express.Request is augmented in src/interfaces/express.d.ts
 * These interfaces provide stricter typing for specific middleware contexts
 */

/**
 * Request with guaranteed requestId (after request-id middleware)
 */
export interface RequestWithId extends Request {
  requestId: string;
}

/**
 * Request with guaranteed user authentication (after auth middleware)
 * Use this type in handlers that require authentication
 * 
 * Note: User roles are now managed via dynamic RBAC system
 */
export interface RequestWithUser extends Request {
  userId: number;
  userAgent?: string;
  clientIP?: string;
}

/**
 * Authenticated user data structure (without name - name is in profiles tables)
 */
export interface IAuthUser {
  id: number;
  email: string;
  phone_number?: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * User data with authentication tokens
 */
export interface IAuthUserWithToken extends IAuthUser {
  token: string;
  refreshToken?: string;
}

/**
 * JWT token payload structure
 */
export interface DataStoredInToken {
  id: number;
  email?: string;
}
