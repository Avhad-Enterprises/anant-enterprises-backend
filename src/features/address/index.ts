/**
 * Address Feature Index
 *
 * Central exports for all address-related functionality
 * NOTE: API routers use dynamic imports to avoid circular dependency with middlewares
 */

import { Router } from 'express';
import Route from '../../interfaces/route.interface';

class AddressRoute implements Route {
  public path = '/addresses';
  public router = Router();

  constructor() {
    this.initializeRoutes();
  }

  private async initializeRoutes() {
    // Dynamic imports to avoid circular dependency
    const { default: getUserAddressesRouter } = await import('./apis/get-user-addresses');
    const { default: createUserAddressRouter } = await import('./apis/create-user-address');
    const { default: updateUserAddressRouter } = await import('./apis/update-user-address');
    const { default: deleteUserAddressRouter } = await import('./apis/delete-user-address');
    const { default: setDefaultAddressRouter } = await import('./apis/set-default-address');

    // Address routes (nested under /users/:userId/addresses in main routing)
    this.router.use(this.path, getUserAddressesRouter);         // GET /users/:userId/addresses
    this.router.use(this.path, createUserAddressRouter);        // POST /users/:userId/addresses
    this.router.use(this.path, setDefaultAddressRouter);        // PUT /users/:userId/addresses/:id/default
    this.router.use(this.path, updateUserAddressRouter);        // PUT /users/:userId/addresses/:id
    this.router.use(this.path, deleteUserAddressRouter);        // DELETE /users/:userId/addresses/:id
  }
}

// Main route export
export default AddressRoute;

// Shared resources - SAFE to export
export * from './shared/addresses.schema';
export * from './shared/payment-methods.schema';
