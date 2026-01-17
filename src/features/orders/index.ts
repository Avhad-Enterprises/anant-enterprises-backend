/**
 * Orders Feature Index
 *
 * Central exports for all orders-related functionality.
 * NOTE: API routers use dynamic imports to avoid circular dependency with middlewares
 *
 * FIX: Uses init() method to ensure routes are registered before server starts
 */

import { Router } from 'express';
import Route from '../../interfaces/route.interface';

class OrdersRoute implements Route {
  // Use empty string - routes define their own full paths (e.g., /admin/orders, /orders)
  public path = '';
  public router = Router();

  constructor() {
    // Routes are initialized via init() which is called by App before server starts
  }

  /**
   * Async initialization - called by App before server starts listening
   * This ensures all routes are registered in the correct order
   */
  public async init(): Promise<void> {
    // Dynamic imports to avoid circular dependency
    const { default: createOrderRouter } = await import('./apis/create-order');
    const { default: getOrdersRouter } = await import('./apis/get-orders');
    const { default: getOrderByIdRouter } = await import('./apis/get-order-by-id');
    const { default: cancelOrderRouter } = await import('./apis/cancel-order');
    const { default: getAdminOrdersRouter } = await import('./apis/get-admin-orders');
    const { default: updateOrderStatusRouter } = await import('./apis/update-order-status');
    // New admin endpoints
    const { default: updateFulfillmentStatusRouter } =
      await import('./apis/update-fulfillment-status');
    const { default: updatePaymentStatusRouter } = await import('./apis/update-payment-status');
    const { default: updateTrackingRouter } = await import('./apis/update-tracking');
    const { default: getDraftOrdersRouter } = await import('./apis/get-draft-orders');
    const { default: confirmDraftOrderRouter } = await import('./apis/confirm-draft-order');
    const { default: getOrderMetricsRouter } = await import('./apis/get-order-metrics');
    const { default: getAdminOrderByIdRouter } = await import('./apis/get-admin-order-by-id');

    // Register routes - they define their own paths
    // IMPORTANT: Order matters! More specific routes MUST come before wildcards

    // Admin routes (more specific paths first)
    this.router.use(this.path, getOrderMetricsRouter); // GET /orders/admin/orders/metrics
    this.router.use(this.path, getDraftOrdersRouter); // GET /orders/admin/orders/drafts
    this.router.use(this.path, confirmDraftOrderRouter); // POST /orders/admin/orders/drafts/:id/confirm
    this.router.use(this.path, updateFulfillmentStatusRouter); // PUT /orders/admin/orders/:id/fulfillment
    this.router.use(this.path, updatePaymentStatusRouter); // PUT /orders/admin/orders/:id/payment
    this.router.use(this.path, updateTrackingRouter); // PUT /orders/admin/orders/:id/tracking
    this.router.use(this.path, getAdminOrdersRouter); // GET /admin/orders
    this.router.use(this.path, getAdminOrderByIdRouter); // GET /admin/orders/:id
    this.router.use(this.path, updateOrderStatusRouter); // PUT /admin/orders/:id/status

    // User routes - MOUNTED AT /orders
    // This strips '/orders' from the path, ensuring routers receive relative paths (e.g. '/' or '/:id')
    this.router.use('/orders', cancelOrderRouter); // handles /:id/cancel
    this.router.use('/orders', createOrderRouter); // handles /
    this.router.use('/orders', getOrdersRouter); // handles /
    this.router.use('/orders', getOrderByIdRouter); // handles /:id
  }
}

export default OrdersRoute;

// Shared resources
export * from './shared';
