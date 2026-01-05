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

    // Product Page Enhancement Routes
    const { default: searchProductsRouter } = await import('./apis/search-products');
    const { default: getRelatedProductsRouter } = await import('./apis/get-related-products');
    const { default: getProductBundlesRouter } = await import('./apis/get-product-bundles');
    const { default: getComparisonProductsRouter } = await import('./apis/get-comparison-products');

    // Collection Page Enhancement Routes
    const { default: getProductFiltersRouter } = await import('./apis/get-product-filters');

    // CRITICAL: Register static routes BEFORE parameterized routes
    // /search, /compare, /filters must come before /:id to avoid route collision
    this.router.use(this.path, searchProductsRouter);
    this.router.use(this.path, getComparisonProductsRouter);
    this.router.use(this.path, getProductFiltersRouter);

    // Standard CRUD routes
    this.router.use(this.path, createProductRouter);
    this.router.use(this.path, getAllProductsRouter);
    this.router.use(this.path, getProductByIdRouter);
    this.router.use(this.path, updateProductRouter);
    this.router.use(this.path, deleteProductRouter);
    this.router.use(this.path, getProductReviewsRouter);

    // Parameterized routes (must come after static routes)
    this.router.use(this.path, getRelatedProductsRouter);
    this.router.use(this.path, getProductBundlesRouter);
  }
}

// Main route export
export default ProductRoute;

// Services - SAFE to export
export { productCacheService, ProductCacheService } from './services/product-cache.service';

// Shared resources - SAFE to export
export * from './shared';
