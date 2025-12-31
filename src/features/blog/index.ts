/**
 * Blog Feature Index
 *
 * Central exports for all blog-related functionality.
 */

import { Router } from 'express';

class BlogRoute {
    public path = '/blogs';
    public router = Router();

    constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes() {
        // defined later
    }
}

export default BlogRoute;

// Shared resources
export * from './shared';
