/**
 * Tier Feature Index
 *
 * Central exports for all category/tier-related functionality.
 */

import { Router } from 'express';

class TierRoute {
    public path = '/tiers';
    public router = Router();

    constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes() {
        // defined later
    }
}

export default TierRoute;

// Shared resources
export * from './shared';
