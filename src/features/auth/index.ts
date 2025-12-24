/**
 * Auth Feature Index
 *
 * Central exports
 * NOTE: API routers use dynamic imports to avoid circular dependency with middlewares for all authentication-related functionality
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
    const { default: registerRouter } = await import('./apis/register');
    const { default: loginRouter } = await import('./apis/login');
    const { default: refreshTokenRouter } = await import('./apis/refresh-token');
    const { default: logoutRouter } = await import('./apis/logout');

    this.router.use(this.path, registerRouter);
    this.router.use(this.path, loginRouter);
    this.router.use(this.path, refreshTokenRouter);
    this.router.use(this.path, logoutRouter);
  }
}

// Main route export
export default AuthRoute;

// Individual API routes
