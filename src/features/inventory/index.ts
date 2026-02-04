/**
 * Inventory Feature Index
 *
 * Registers all inventory-related API routes.
 * 
 * Refactored to use modular router pattern and dynamic imports
 * to avoid circular dependencies.
 */

import { Router } from 'express';
import Route from '../../interfaces/route.interface';

class InventoryRoute implements Route {
  public path = '/inventory';
  public router = Router();

  constructor() {
    this.initializeRoutes();
  }

  private async initializeRoutes() {
    // Dynamic imports to avoid circular dependency
    const { default: backfillInventoryRouter } = await import('./apis/backfill-inventory');
    const { default: getInventoryHistoryByProductRouter } = await import('./apis/get-inventory-history-by-product');
    const { default: getAvailableStockRouter } = await import('./apis/get-available-stock');

    // Core CRUD routers
    const { default: getAllInventoryRouter } = await import('./apis/get-all-inventory');
    const { default: getInventoryByIdRouter } = await import('./apis/get-inventory-by-id');
    const { default: updateInventoryRouter } = await import('./apis/update-inventory');
    const { default: adjustInventoryRouter } = await import('./apis/adjust-inventory');
    const { default: getInventoryHistoryRouter } = await import('./apis/get-inventory-history');

    // ORDER MATTERS: Most specific routes first!

    // POST /api/inventory/backfill - Admin: Create inventory for products without one
    this.router.use(this.path, backfillInventoryRouter);

    // GET /api/inventory/products/:productId/history - History by product ID (NEW)
    this.router.use(this.path, getInventoryHistoryByProductRouter);

    // GET /api/inventory/product/:productId/available - Real-time available stock
    this.router.use(this.path, getAvailableStockRouter);

    // GET /api/inventory/:id/history
    this.router.use(this.path, getInventoryHistoryRouter);

    // POST /api/inventory/:id/adjust
    this.router.use(this.path, adjustInventoryRouter);

    // PUT /api/inventory/:id
    this.router.use(this.path, updateInventoryRouter);

    // GET /api/inventory/:id
    this.router.use(this.path, getInventoryByIdRouter);

    // GET /api/inventory (LIST - must be LAST)
    this.router.use(this.path, getAllInventoryRouter);

    // Phase 3: Multi-location routes
    const { default: getProductLocations } = await import('./apis/get-product-locations');
    const { default: createTransfer } = await import('./apis/create-transfer');
    const { default: executeTransfer } = await import('./apis/execute-transfer');
    const { default: listTransfers } = await import('./apis/list-transfers');

    this.router.use(this.path, getProductLocations);
    this.router.use(this.path, createTransfer);
    this.router.use(this.path, executeTransfer);
    this.router.use(this.path, listTransfers);
  }
}

export default InventoryRoute;

// Shared resources
export * from './shared';

// Services
export * from './services/inventory.service';
