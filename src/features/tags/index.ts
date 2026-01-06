/**
 * Tags Feature Index
 *
 * Central exports for all tags-related functionality.
 */

import { Router } from 'express';

class TagRoute {
  public path = '/tags';
  public router = Router();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // defined later
  }
}

export default TagRoute;

// Shared resources
export * from './shared';
