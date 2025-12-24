/**
 * Auth Feature Index
 *
 * Central exports for all authentication-related functionality
 */

import { Router } from 'express';
import Route from '../../interfaces/route.interface';
import registerRouter from './apis/register';
import loginRouter from './apis/login';
import refreshTokenRouter from './apis/refresh-token';
import logoutRouter from './apis/logout';

class AuthRoute implements Route {
  public path = '/auth';
  public router = Router();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.use(this.path, registerRouter);
    this.router.use(this.path, loginRouter);
    this.router.use(this.path, refreshTokenRouter);
    this.router.use(this.path, logoutRouter);
  }
}

// Main route export
export default AuthRoute;

// Individual API routes
export { default as registerRouter } from './apis/register';
export { default as loginRouter } from './apis/login';
export { default as refreshTokenRouter } from './apis/refresh-token';
export { default as logoutRouter } from './apis/logout';
