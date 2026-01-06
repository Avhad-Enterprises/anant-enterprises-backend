/**
 * Wishlist Feature Index
 *
 * Central exports for all wishlist-related functionality.
 * NOTE: API routers use dynamic imports to avoid circular dependency with middlewares
 */

import { Router } from 'express';
import Route from '../../interfaces/route.interface';

class WishlistRoute implements Route {
    public path = '/wishlist';
    public router = Router();

    constructor() {
        this.initializeRoutes();
    }

    private async initializeRoutes() {
        // Dynamic imports to avoid circular dependency
        const { default: getWishlistRouter } = await import('./apis/get-wishlist');
        const { default: addToWishlistRouter } = await import('./apis/add-to-wishlist');
        const { default: removeFromWishlistRouter } = await import('./apis/remove-from-wishlist');
        const { default: moveToCartRouter } = await import('./apis/move-to-cart');
        const { default: checkWishlistRouter } = await import('./apis/check-wishlist');

        // Register routes
        // CRITICAL: Register specific routes BEFORE parameterized routes
        this.router.use(this.path, checkWishlistRouter);        // GET /wishlist/check/:productId
        this.router.use(this.path, moveToCartRouter);           // POST /wishlist/items/:productId/move-to-cart
        this.router.use(this.path, addToWishlistRouter);        // POST /wishlist/items
        this.router.use(this.path, removeFromWishlistRouter);   // DELETE /wishlist/items/:productId
        this.router.use(this.path, getWishlistRouter);          // GET /wishlist
    }
}

export default WishlistRoute;

// Shared resources
export * from './shared';
