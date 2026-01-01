/**
 * Bundles Feature Index
 */

import { Router } from 'express';

class BundleRoute {
    public path = '/bundles';
    public router = Router();

    constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes() {
        // defined later
    }
}

export default BundleRoute;

// Shared resources
export * from './shared';
