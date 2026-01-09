/**
 * Tier Feature Index
 *
 * Central exports for all category/tier-related functionality.
 */

import { Router } from 'express';
import getTiers from './apis/get-tiers';

class TierRoute {
  public path = '/tiers';
  public router = Router();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.use('/', getTiers);
  }
}

export default TierRoute;

// Shared resources
export * from './shared';
