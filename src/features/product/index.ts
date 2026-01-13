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
    const { default: getProductBySlugRouter } = await import('./apis/get-product-by-slug');
    const { default: getProductFiltersRouter } = await import('./apis/get-product-filters');

    // Register core CRUD routes
    this.router.use(this.path, createProductRouter);        // POST /products
    this.router.use(this.path, getAllProductsRouter);       // GET /products
    this.router.use(this.path, getProductFiltersRouter);    // GET /products/filters (MUST BE BEFORE :id)
    this.router.use(this.path, getProductByIdRouter);       // GET /products/:id
    this.router.use(this.path, getProductBySlugRouter);     // GET /products/slug/:slug
    this.router.use(this.path, updateProductRouter);        // PUT /products/:id
    this.router.use(this.path, deleteProductRouter);        // DELETE /products/:id
  }
}

// Main route export
export default ProductRoute;

// Services - SAFE to export
export { productCacheService, ProductCacheService } from './services/product-cache.service';

// Shared resources - SAFE to export
export * from './shared';
