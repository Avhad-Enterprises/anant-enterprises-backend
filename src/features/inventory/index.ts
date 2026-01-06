/**
 * Inventory Feature Index
 */

import { Router } from 'express';

class InventoryRoute {
  public path = '/inventory';
  public router = Router();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // API routes will be defined later
  }
}

export default InventoryRoute;

// Shared resources
export * from './shared';
