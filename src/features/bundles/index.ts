/**
 * Bundles Feature Index
 */

import { Router } from 'express';
import getAllBundles from './apis/get-all-bundles';

class BundleRoute {
    public path = '/bundles';
    public router = Router();

    constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.get(this.path, getAllBundles);
    }
}

export default BundleRoute;

// Shared resources
export * from './shared';
