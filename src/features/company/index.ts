/**
 * Company Feature Index
 *
 * Central exports for all company-related functionality.
 */

import { Router } from 'express';

class CompanyRoute {
  public path = '/companies';
  public router = Router();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // defined later
  }
}

export default CompanyRoute;

// Shared resources
export * from './shared';
