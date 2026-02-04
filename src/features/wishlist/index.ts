/**
 * Wishlist Feature Index
 *
 * Central exports for all wishlist-related functionality.
 * NOTE: API routers use dynamic imports to avoid circular dependency with middlewares
 * 
 * ALL ROUTES ARE ADMIN-ONLY and require /:userId parameter
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

    // Register admin-only routes
    // All routes now require /:userId param for admin access
    this.router.use(this.path, getWishlistRouter);          // GET /wishlist/:userId/wishlist
    this.router.use(this.path, addToWishlistRouter);        // POST /wishlist/:userId/wishlist/:productId
    this.router.use(this.path, removeFromWishlistRouter);   // DELETE /wishlist/:userId/wishlist/:productId
    this.router.use(this.path, moveToCartRouter);           // POST /wishlist/:userId/wishlist/:productId/move-to-cart
  }
}

export default WishlistRoute;

// Shared resources
export * from './shared';
