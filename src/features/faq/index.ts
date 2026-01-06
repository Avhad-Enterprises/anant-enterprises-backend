/**
 * FAQ Feature Index
 *
 * Central exports for all FAQ-related functionality.
 */

import { Router } from 'express';

class FaqRoute {
  public path = '/faqs';
  public router = Router();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // defined later
  }
}

export default FaqRoute;

// Shared resources
export * from './shared';
