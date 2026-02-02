/**
 * Customer Feature Index
 *
 * Central exports for all customer-related functionality
 * NOTE: API routers use dynamic imports to avoid circular dependency with middlewares
 */

import { Router } from 'express';
import Route from '../../interfaces/route.interface';

class CustomerRoute implements Route {
  public path = '/customers';
  public router = Router();

  constructor() {
    this.initializeRoutes();
  }

  private async initializeRoutes() {
    // Dynamic imports to avoid circular dependency
    const { default: getAllCustomersRouter } = await import('./apis/get-all-customers');
    const { default: getCustomerByIdRouter } = await import('./apis/get-customer-by-id');
    const { default: createCustomerRouter } = await import('./apis/create-customer');
    const { default: updateCustomerRouter } = await import('./apis/update-customer');
    const { default: deleteCustomerRouter } = await import('./apis/delete-customer');
    const { default: bulkDeleteCustomersRouter } = await import('./apis/bulk-delete-customers');
    const { default: getCustomerMetricsRouter } = await import('./apis/get-customer-metrics');
    const { default: importCustomersRouter } = await import('./apis/import-customers');
    const { default: exportCustomersRouter } = await import('./apis/export-customers');
    const { default: getUserTagsRouter } = await import('./apis/get-user-tags');

    // Static routes BEFORE dynamic :id routes
    this.router.use(this.path, getAllCustomersRouter);          // GET /customers
    this.router.use(this.path, createCustomerRouter);           // POST /customers
    this.router.use(this.path, bulkDeleteCustomersRouter);      // POST /customers/bulk-delete
    this.router.use(this.path, getCustomerMetricsRouter);       // GET /customers/metrics
    this.router.use(this.path, getUserTagsRouter);              // GET /customers/tags
    this.router.use(`${this.path}/import`, importCustomersRouter); // POST /customers/import
    this.router.use(`${this.path}/export`, exportCustomersRouter); // POST /customers/export
    
    // Dynamic :id routes LAST
    this.router.use(this.path, getCustomerByIdRouter);          // GET /customers/:id
    this.router.use(this.path, updateCustomerRouter);           // PUT /customers/:id
    this.router.use(this.path, deleteCustomerRouter);           // DELETE /customers/:id
  }
}

// Main route export
export default CustomerRoute;

// Shared resources - SAFE to export
export * from './shared/customer-profiles.schema';
export * from './shared/customer-statistics.schema';
export * from './shared/business-profiles.schema';
