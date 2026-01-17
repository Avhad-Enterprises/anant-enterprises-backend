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
    const { default: getCustomerByIdRouter } = await import('./apis/get-customer-by-id');
    const { default: getAllCustomersRouter } = await import('./apis/get-all-customers');
    const { default: createCustomerRouter } = await import('./apis/create-customer');
    const { default: updateCustomerRouter } = await import('./apis/update-customer');
    const { default: deleteCustomerRouter } = await import('./apis/delete-customer');
    const { default: updateUserRouter } = await import('./apis/update-user');
    const { default: deleteUserRouter } = await import('./apis/delete-user');

    const { default: getUserOrdersRouter } = await import('./apis/get-user-orders');

    const { default: getUserAddressesRouter } = await import('./apis/get-user-addresses');
    const { default: createUserAddressRouter } = await import('./apis/create-user-address');
    const { default: updateUserAddressRouter } = await import('./apis/update-user-address');
    const { default: deleteUserAddressRouter } = await import('./apis/delete-user-address');
    const { default: setDefaultAddressRouter } = await import('./apis/set-default-address');

    const { default: getUserWishlistRouter } = await import('./apis/get-user-wishlist');
    const { default: addToWishlistRouter } = await import('./apis/add-to-wishlist');
    const { default: removeFromWishlistRouter } = await import('./apis/remove-from-wishlist');
    const { default: moveWishlistToCartRouter } = await import('./apis/move-wishlist-to-cart');

    this.router.use(this.path, getAllUsersRouter);
    this.router.use(this.path, getCurrentUserRouter);
    this.router.use(this.path, getAllCustomersRouter); // Moved up
    this.router.use(this.path, getCustomerByIdRouter); // Moved up
    this.router.use(this.path, createCustomerRouter); // NEW: Create customer

    // Sub-resources first
    this.router.use(this.path, getUserOrdersRouter);
    this.router.use(this.path, getUserAddressesRouter);
    this.router.use(this.path, createUserAddressRouter);
    this.router.use(this.path, updateUserAddressRouter);
    this.router.use(this.path, deleteUserAddressRouter);
    this.router.use(this.path, setDefaultAddressRouter);
    this.router.use(this.path, getUserWishlistRouter);
    this.router.use(this.path, addToWishlistRouter);
    this.router.use(this.path, removeFromWishlistRouter);
    this.router.use(this.path, moveWishlistToCartRouter);

    // Dynamic ID routes LAST
    this.router.use(this.path, getUserByIdRouter);
    this.router.use(this.path, updateCustomerRouter);
    this.router.use(this.path, deleteCustomerRouter);
    this.router.use(this.path, updateUserRouter);
    this.router.use(this.path, deleteUserRouter);
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

// E-commerce schemas
export * from './shared/addresses.schema';
export * from './shared/payment-methods.schema';
export * from './shared/customer-profiles.schema';
export * from './shared/business-profiles.schema';
export * from './shared/admin-profiles.schema';
// export * from './shared/vendors.schema'; // TODO: Enable when vendor feature is needed
export * from './shared/customer-statistics.schema';
