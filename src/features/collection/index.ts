/**
 * Collection Feature Index
 *
 * Central exports for all collection-related functionality.
 */

import { Router } from 'express';

class CollectionRoute {
    public path = '/collections';
    public router = Router();

    constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes() {
        // defined later
    }
}

export default CollectionRoute;

// Shared resources
export * from './shared';
