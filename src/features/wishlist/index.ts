/**
 * Wishlist Feature Index
 *
 * Central exports for all wishlist-related functionality.
 */

import { Router } from 'express';

class WishlistRoute {
    public path = '/wishlists';
    public router = Router();

    constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes() {
        // defined later
    }
}

export default WishlistRoute;

// Shared resources
export * from './shared';
