/**
 * Product Feature Index
 *
 * Central exports for all product-related functionality
 * NOTE: API routers use dynamic imports to avoid circular dependency with middlewares
 */

import { Router } from 'express';
import Route from '../../interfaces/route.interface';

class ProductRoute implements Route {
    public path = '/products';
    public router = Router();

    constructor() {
        this.initializeRoutes();
    }

    private async initializeRoutes() {
        // Dynamic imports to avoid circular dependency
        const { default: createProductRouter } = await import('./apis/create-product');
        const { default: getAllProductsRouter } = await import('./apis/get-all-products');
        const { default: getProductByIdRouter } = await import('./apis/get-product-by-id');
        const { default: updateProductRouter } = await import('./apis/update-product');
        const { default: deleteProductRouter } = await import('./apis/delete-product');
        const { default: getProductReviewsRouter } = await import('./apis/get-product-reviews');

        this.router.use(this.path, createProductRouter);
        this.router.use(this.path, getAllProductsRouter);
        this.router.use(this.path, getProductByIdRouter);
        this.router.use(this.path, updateProductRouter);
        this.router.use(this.path, deleteProductRouter);
        this.router.use(this.path, getProductReviewsRouter);
    }
}

// Main route export
export default ProductRoute;

// Services - SAFE to export
export { productCacheService, ProductCacheService } from './services/product-cache.service';

// Shared resources - SAFE to export
export * from './shared';
