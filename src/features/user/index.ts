/**
 * User Feature Index
 *
 * Central exports for all user-related functionality
 * NOTE: API routers use dynamic imports to avoid circular dependency with middlewares
 */

import { Router } from 'express';
import Route from '../../interfaces/route.interface';

class UserRoute implements Route {
  public path = '/users';
  public router = Router();

  constructor() {
    this.initializeRoutes();
  }

  private async initializeRoutes() {
    // Dynamic imports to avoid circular dependency
    const { default: getAllUsersRouter } = await import('./apis/get-all-users');
    const { default: getCurrentUserRouter } = await import('./apis/get-current-user');
    const { default: getUserByIdRouter } = await import('./apis/get-user-by-id');
    const { default: updateUserRouter } = await import('./apis/update-user');
    const { default: deleteUserRouter } = await import('./apis/delete-user');

    const { default: getUserOrdersRouter } = await import('../orders/apis/get-user-orders');

    // Address routers (dynamically imported)
    const { default: getUserAddressesRouter } = await import('../address/apis/get-user-addresses');
    const { default: createUserAddressRouter } = await import('../address/apis/create-user-address');
    const { default: updateUserAddressRouter } = await import('../address/apis/update-user-address');
    const { default: deleteUserAddressRouter } = await import('../address/apis/delete-user-address');
    const { default: setDefaultAddressRouter } = await import('../address/apis/set-default-address');

    // OTP verification routes
    const { default: sendEmailOtpRouter } = await import('./apis/send-email-otp');
    const { default: verifyEmailOtpRouter } = await import('./apis/verify-email-otp');

    // Customer routes - MUST be before dynamic :id routes to avoid 'customers', 'metrics', 'tags' being treated as UUIDs
    const { default: getAllCustomersRouter } = await import('../customer/apis/get-all-customers');
    const { default: getCustomerByIdRouter } = await import('../customer/apis/get-customer-by-id');
    const { default: createCustomerRouter } = await import('../customer/apis/create-customer');
    const { default: updateCustomerRouter } = await import('../customer/apis/update-customer');
    const { default: deleteCustomerRouter } = await import('../customer/apis/delete-customer');
    const { default: bulkDeleteCustomersRouter } = await import('../customer/apis/bulk-delete-customers');
    const { default: getCustomerMetricsRouter } = await import('../customer/apis/get-customer-metrics');
    const { default: importCustomersRouter } = await import('../customer/apis/import-customers');
    const { default: exportCustomersRouter } = await import('../customer/apis/export-customers');
    const { default: getUserTagsRouter } = await import('../customer/apis/get-user-tags');
    const { default: getCustomerActivityRouter } = await import('../customer/apis/get-customer-activity');

    // Core user routes
    this.router.use(this.path, getAllUsersRouter);          // GET /users
    this.router.use(this.path, getCurrentUserRouter);       // GET /users/me

    // OTP verification endpoints
    this.router.use(this.path, sendEmailOtpRouter);         // POST /users/send-otp
    this.router.use(this.path, verifyEmailOtpRouter);       // POST /users/verify-otp

    // Customer routes (static paths BEFORE dynamic :id)
    this.router.use(this.path, getAllCustomersRouter);      // GET /users/customers
    this.router.use(this.path, getCustomerMetricsRouter);   // GET /users/metrics
    this.router.use(this.path, getUserTagsRouter);          // GET /users/tags
    this.router.use(this.path, createCustomerRouter);       // POST /users/customer
    this.router.use(this.path, bulkDeleteCustomersRouter);  // POST /users/bulk-delete
    this.router.use(`${this.path}/customers/import`, importCustomersRouter);   // POST /users/customers/import
    this.router.use(`${this.path}/customers/export`, exportCustomersRouter);   // POST /users/customers/export

    // Sub-resources
    this.router.use(this.path, getUserOrdersRouter);        // GET /users/:userId/orders

    // Address sub-resources (Fix for 404: Mount address routes under /users)
    this.router.use(this.path, getUserAddressesRouter);         // GET /users/:userId/addresses
    this.router.use(this.path, createUserAddressRouter);        // POST /users/:userId/addresses
    this.router.use(this.path, setDefaultAddressRouter);        // PUT /users/:userId/addresses/:id/default
    this.router.use(this.path, updateUserAddressRouter);        // PUT /users/:userId/addresses/:id
    this.router.use(this.path, deleteUserAddressRouter);        // DELETE /users/:userId/addresses/:id

    // Dynamic ID routes (customer-specific) - these use /customer/:id pattern
    this.router.use(this.path, getCustomerByIdRouter);      // GET /users/customer/:id
    this.router.use(this.path, getCustomerActivityRouter);  // GET /users/customer/:id/activity
    this.router.use(this.path, updateCustomerRouter);       // PUT /users/customer/:id
    this.router.use(this.path, deleteCustomerRouter);       // DELETE /users/customer/:id

    // Dynamic ID routes LAST (generic user routes)
    this.router.use(this.path, getUserByIdRouter);          // GET /users/:id
    this.router.use(this.path, updateUserRouter);           // PUT /users/:id
    this.router.use(this.path, deleteUserRouter);           // DELETE /users/:id
  }
}

// Main route export
export default UserRoute;

// Services - SAFE to export
export { userCacheService, UserCacheService } from './services/user-cache.service';

// Shared resources - SAFE to export
// Core user schema and types
export * from './shared/user.schema';
export * from './shared/interface';
export * from './shared/queries';
export * from './shared/sanitizeUser';

// E-commerce schemas moved to their respective features:
// - business-profiles.schema → customer/shared/
// - admin-profiles.schema → admin/shared/
// export * from './shared/vendors.schema'; // TODO: Enable when vendor feature is needed
