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
    const { default: getUserByIdRouter } = await import('./apis/get-user-by-id');
    const { default: updateUserRouter } = await import('./apis/update-user');
    const { default: deleteUserRouter } = await import('./apis/delete-user');

    this.router.use(this.path, getAllUsersRouter);
    this.router.use(this.path, getUserByIdRouter);
    this.router.use(this.path, updateUserRouter);
    this.router.use(this.path, deleteUserRouter);
  }
}

// Main route export
export default UserRoute;

// Services - SAFE to export
export { userCacheService, UserCacheService } from './services/user-cache.service';

// Shared resources - SAFE to export  
export * from './shared/schema';
export * from './shared/interface';
export * from './shared/queries';
export * from './shared/sanitizeUser';


