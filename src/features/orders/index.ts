/**
 * Orders Feature Index
 *
 * Central exports for all orders-related functionality.
 * NOTE: API routers use dynamic imports to avoid circular dependency with middlewares
 */

import { Router } from 'express';
import Route from '../../interfaces/route.interface';

class OrdersRoute implements Route {
  public path = '/orders';
  public router = Router();

  constructor() {
    this.initializeRoutes();
  }

  private async initializeRoutes() {
    // Dynamic imports to avoid circular dependency
    const { default: createOrderRouter } = await import('./apis/create-order');
    const { default: getOrdersRouter } = await import('./apis/get-orders');
    const { default: getOrderByIdRouter } = await import('./apis/get-order-by-id');
    const { default: cancelOrderRouter } = await import('./apis/cancel-order');
    const { default: getAdminOrdersRouter } = await import('./apis/get-admin-orders');
    const { default: updateOrderStatusRouter } = await import('./apis/update-order-status');

    // Register routes
    // CRITICAL: Register specific routes BEFORE parameterized routes
    this.router.use(this.path, getAdminOrdersRouter);      // GET /orders/admin/orders
    this.router.use(this.path, updateOrderStatusRouter);   // PUT /orders/admin/orders/:id/status
    this.router.use(this.path, cancelOrderRouter);         // POST /orders/:id/cancel
    this.router.use(this.path, createOrderRouter);         // POST /orders
    this.router.use(this.path, getOrdersRouter);           // GET /orders
    this.router.use(this.path, getOrderByIdRouter);        // GET /orders/:id
  }
}

export default OrdersRoute;

// Shared resources
export * from './shared';
