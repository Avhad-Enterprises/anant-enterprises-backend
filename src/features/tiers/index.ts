/**
 * Tier Feature Index
 *
 * Central exports for all category/tier-related functionality.
 */

import { Router } from 'express';
import Route from '../../interfaces/route.interface';

class TierRoute implements Route {
  public path = '/tiers';
  public router = Router();

  constructor() {
    this.initializeRoutes();
  }

  private async initializeRoutes() {
    const { default: createTierRouter } = await import('./apis/create-tier');
    const { default: getTiersRouter } = await import('./apis/get-tiers');
    const { default: getTierHierarchyRouter } = await import('./apis/get-tier-hierarchy');
    const { default: getTierByIdRouter } = await import('./apis/get-tier-by-id');
    const { default: updateTierRouter } = await import('./apis/update-tier');
    const { default: deleteTierRouter } = await import('./apis/delete-tier');
    const { default: bulkDeleteTierRouter } = await import('./apis/bulk-delete-tiers');

    // Register routes in order (specific routes before parametrized ones)
    this.router.use(this.path, createTierRouter);         // POST /tiers
    this.router.use(this.path, getTiersRouter);           // GET /tiers
    this.router.use(this.path, getTierHierarchyRouter);   // GET /tiers/hierarchy
    this.router.use(this.path, bulkDeleteTierRouter);     // POST /tiers/bulk-delete (Must be before :id)
    this.router.use(this.path, getTierByIdRouter);        // GET /tiers/:id
    this.router.use(this.path, updateTierRouter);         // PUT /tiers/:id
    this.router.use(this.path, deleteTierRouter);         // DELETE /tiers/:id

  }
}

export default TierRoute;

// Shared resources
export * from './shared';

// Services
export * from './services/tier-sync.service';
