/**
 * User Feature Index
 *
 * Central exports for all user-related functionality
 * NOTE: API routers use dynamic imports to avoid circular dependency with middlewares
 */

import { Router } from 'express';
import Route from '../../interfaces/route.interface';

class UserRoute implements Route {
  public path = '/users';
  public router = Router();

  constructor() {
    this.initializeRoutes();
  }

  private async initializeRoutes() {
    // Dynamic imports to avoid circular dependency
    const { default: getAllUsersRouter } = await import('./apis/get-all-users');
    const { default: getCurrentUserRouter } = await import('./apis/get-current-user');
    const { default: getUserByIdRouter } = await import('./apis/get-user-by-id');
    const { default: updateUserRouter } = await import('./apis/update-user');
    const { default: deleteUserRouter } = await import('./apis/delete-user');

    const { default: getUserOrdersRouter } = await import('../orders/apis/get-user-orders');

    // OTP verification routes
    const { default: sendEmailOtpRouter } = await import('./apis/send-email-otp');
    const { default: verifyEmailOtpRouter } = await import('./apis/verify-email-otp');

    // Core user routes
    this.router.use(this.path, getAllUsersRouter);          // GET /users
    this.router.use(this.path, getCurrentUserRouter);       // GET /users/me
    
    // OTP verification endpoints
    this.router.use(this.path, sendEmailOtpRouter);         // POST /users/send-otp
    this.router.use(this.path, verifyEmailOtpRouter);       // POST /users/verify-otp

    // Sub-resources
    this.router.use(this.path, getUserOrdersRouter);        // GET /users/:userId/orders

    // Dynamic ID routes LAST
    this.router.use(this.path, getUserByIdRouter);          // GET /users/:id
    this.router.use(this.path, updateUserRouter);           // PUT /users/:id
    this.router.use(this.path, deleteUserRouter);           // DELETE /users/:id
  }
}

// Main route export
export default UserRoute;

// Services - SAFE to export
export { userCacheService, UserCacheService } from './services/user-cache.service';

// Shared resources - SAFE to export
// Core user schema and types
export * from './shared/user.schema';
export * from './shared/interface';
export * from './shared/queries';
export * from './shared/sanitizeUser';

// E-commerce schemas moved to their respective features:
// - business-profiles.schema → customer/shared/
// - admin-profiles.schema → admin/shared/
// export * from './shared/vendors.schema'; // TODO: Enable when vendor feature is needed
