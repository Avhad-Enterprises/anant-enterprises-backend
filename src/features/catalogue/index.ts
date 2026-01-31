/**
 * Catalogue Feature Index
 *
 * Central exports for all catalogue-related functionality.
 */

import { Router } from 'express';

class CatalogueRoute {
  public path = '/catalogues';
  public router = Router();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // defined later
  }
}

export default CatalogueRoute;

// Shared resources
export * from './shared';
