/**
 * Cart Feature Index
 *
 * Central exports for all cart-related functionality.
 * NOTE: API routers use dynamic imports to avoid circular dependency with middlewares
 */

import { Router } from 'express';
import Route from '../../interfaces/route.interface';

class CartRoute implements Route {
    public path = '/cart';
    public router = Router();

  constructor() {
    this.initializeRoutes();
  }

    private async initializeRoutes() {
        // Dynamic imports to avoid circular dependency
        const { default: addToCartRouter } = await import('./apis/add-to-cart');
        const { default: getCartRouter } = await import('./apis/get-cart');
        const { default: updateCartItemRouter } = await import('./apis/update-cart-item');
        const { default: removeCartItemRouter } = await import('./apis/remove-cart-item');
        const { default: clearCartRouter } = await import('./apis/clear-cart');
        const { default: validateCartRouter } = await import('./apis/validate-cart');
        const { default: mergeCartRouter } = await import('./apis/merge-cart');

        // Register routes
        // CRITICAL: Register specific routes BEFORE parameterized routes
        this.router.use(this.path, mergeCartRouter);         // POST /cart/merge
        this.router.use(this.path, validateCartRouter);      // POST /cart/validate
        this.router.use(this.path, addToCartRouter);         // POST /cart/items
        this.router.use(this.path, updateCartItemRouter);    // PUT /cart/items/:id
        this.router.use(this.path, removeCartItemRouter);    // DELETE /cart/items/:id
        this.router.use(this.path, getCartRouter);           // GET /cart
        this.router.use(this.path, clearCartRouter);         // DELETE /cart
    }
}

export default CartRoute;

// Shared resources
export * from './shared';

