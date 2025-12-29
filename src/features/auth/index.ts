/**
 * Auth Feature Index
 *
 * Central exports for all authentication-related functionality
 * 
 * IMPORTANT: Authentication (sign up, sign in, sign out) is handled by the FRONTEND
 * using Supabase client libraries (@supabase/supabase-js).
 * 
 * Backend provides:
 * - Token verification (middleware)
 * - Password reset endpoints
 * - Webhooks for user sync
 * - RBAC integration
 */

import { Router } from 'express';
import Route from '../../interfaces/route.interface';

class AuthRoute implements Route {
  public path = '/auth';
  public router = Router();

  constructor() {
    this.initializeRoutes();
  }

  private async initializeRoutes() {
    // Dynamic imports to avoid circular dependency
    const { default: refreshTokenRouter } = await import('./apis/refresh-token');
    const { default: requestPasswordResetRouter } = await import('./apis/request-password-reset');
    const { default: resetPasswordRouter } = await import('./apis/reset-password');

    this.router.use(this.path, refreshTokenRouter);
    this.router.use(this.path, requestPasswordResetRouter);
    this.router.use(this.path, resetPasswordRouter);
  }
}

// Main route export
export default AuthRoute;

// Services - SAFE to export
export * from './services/supabase-auth.service';

// Shared resources - SAFE to export
export * from './shared/interface';
export * from './shared/queries';
