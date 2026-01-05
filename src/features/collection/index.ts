/**
 * Collection Feature Index
 *
 * Central exports for all collection-related functionality.
 * NOTE: API routers use dynamic imports to avoid circular dependency with middlewares
 */

import { Router } from 'express';
import Route from '../../interfaces/route.interface';

class CollectionRoute implements Route {
  public path = '/collections';
  public router = Router();

  constructor() {
    this.initializeRoutes();
  }

  private async initializeRoutes() {
    // Dynamic imports to avoid circular dependency

    // Public endpoints
    const { default: getAllCollectionsRouter } = await import('./apis/get-all-collections');
    const { default: getCollectionBySlugRouter } = await import('./apis/get-collection-by-slug');
    const { default: getCollectionProductsRouter } = await import('./apis/get-collection-products');

    // Admin CRUD endpoints
    const { default: createCollectionRouter } = await import('./apis/create-collection');
    const { default: updateCollectionRouter } = await import('./apis/update-collection');

    // Phase 2: Product Management
    const { default: addProductsToCollectionRouter } =
      await import('./apis/add-products-to-collection');
    const { default: removeProductFromCollectionRouter } =
      await import('./apis/remove-product-from-collection');
    const { default: getAdminCollectionsRouter } = await import('./apis/get-admin-collections');

    // Phase 3: Enhancement Features
    const { default: reorderCollectionProductsRouter } =
      await import('./apis/reorder-collection-products');
    const { default: deleteCollectionRouter } = await import('./apis/delete-collection');
    const { default: getFeaturedCollectionsRouter } =
      await import('./apis/get-featured-collections');

    // Register routes
    // CRITICAL: Register specific routes BEFORE parameterized routes
    this.router.use(this.path, getFeaturedCollectionsRouter); // /featured (before /:id)
    this.router.use(this.path, getAdminCollectionsRouter); // /admin/collections (before /:id)
    this.router.use(this.path, getCollectionProductsRouter); // /:slug/products
    this.router.use(this.path, getAllCollectionsRouter); // /
    this.router.use(this.path, getCollectionBySlugRouter); // /:slug
    this.router.use(this.path, createCollectionRouter); // POST /
    this.router.use(this.path, updateCollectionRouter); // PUT /:id
    this.router.use(this.path, deleteCollectionRouter); // DELETE /:id
    this.router.use(this.path, addProductsToCollectionRouter); // POST /:id/products
    this.router.use(this.path, removeProductFromCollectionRouter); // DELETE /:id/products/:productId
    this.router.use(this.path, reorderCollectionProductsRouter); // PUT /:id/products/reorder
  }
}

// Main route export
export default CollectionRoute;

// Services - SAFE to export
export {
  collectionCacheService,
  CollectionCacheService,
} from './services/collection-cache.service';

// Shared resources - SAFE to export
export * from './shared';
