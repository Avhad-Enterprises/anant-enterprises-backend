/**
 * User Feature Index
 *
 * Central exports for all user-related functionality
 */

import { Router } from 'express';
import Route from '../../interfaces/route.interface';
import getAllUsersRouter from './apis/get-all-users';
import getUserByIdRouter from './apis/get-user-by-id';
import updateUserRouter from './apis/update-user';
import deleteUserRouter from './apis/delete-user';

class UserRoute implements Route {
  public path = '/users';
  public router = Router();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.use(this.path, getAllUsersRouter);
    this.router.use(this.path, getUserByIdRouter);
    this.router.use(this.path, updateUserRouter);
    this.router.use(this.path, deleteUserRouter);
  }
}

// Main route export
export default UserRoute;

// Individual API routes
export { default as getAllUsersRouter } from './apis/get-all-users';
export { default as getUserByIdRouter } from './apis/get-user-by-id';
export { default as updateUserRouter } from './apis/update-user';
export { default as deleteUserRouter } from './apis/delete-user';

// Services
export { userCacheService, UserCacheService } from './services/user-cache.service';

// Shared resources
export * from './shared/schema';
export * from './shared/interface';
export * from './shared/queries';
