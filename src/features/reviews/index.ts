/**
 * Reviews Feature Index
 *
 * Central exports for all reviews/Q&A functionality.
 */

import { Router } from 'express';

class ReviewRoute {
    public path = '/reviews';
    public router = Router();

    constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes() {
        // defined later
    }
}

export default ReviewRoute;

// Shared resources
export * from './shared';
