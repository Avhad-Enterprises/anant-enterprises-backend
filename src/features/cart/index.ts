/**
 * Cart Feature Index
 */

import { Router } from 'express';

class CartRoute {
  public path = '/cart';
  public router = Router();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // API routes will be defined later
  }
}

export default CartRoute;

// Shared resources
export * from './shared';
