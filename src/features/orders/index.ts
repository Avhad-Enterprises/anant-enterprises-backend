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
    const { default: updateOrderRouter } = await import('./apis/update-order');
    // New admin endpoints
    const { default: updateFulfillmentStatusRouter } =
      await import('./apis/update-fulfillment-status');
    const { default: updatePaymentStatusRouter } = await import('./apis/update-payment-status');
    const { default: updateTrackingRouter } = await import('./apis/update-tracking');
    const { default: getDraftOrdersRouter } = await import('./apis/get-draft-orders');
    const { default: confirmDraftOrderRouter } = await import('./apis/confirm-draft-order');
    const { default: getOrderMetricsRouter } = await import('./apis/get-order-metrics');
    const { default: getAdminOrderByIdRouter } = await import('./apis/get-admin-order-by-id');

    // Abandoned cart endpoints
    const { default: getAbandonedCartsRouter } = await import('./apis/get-abandoned-carts');
    const { default: getAbandonedCartMetricsRouter } =
      await import('./apis/get-abandoned-cart-metrics');
    const { default: getAbandonedCartDetailsRouter } =
      await import('./apis/get-abandoned-cart-details');
    const { default: sendAbandonedCartEmailsRouter } =
      await import('./apis/send-abandoned-cart-emails');
    const { default: getEmailTemplatesRouter } = await import('./apis/get-email-templates');

    // Phase 3: Enhanced order management endpoints
    const { default: duplicateOrderRouter } = await import('./apis/duplicate-order');
    const { default: deleteOrdersRouter } = await import('./apis/delete-orders');
    const { default: searchProductsRouter } = await import('./apis/search-products');
    const { default: getOrderTagsRouter } = await import('./apis/get-order-tags');
    const { default: createOrderTagRouter } = await import('./apis/create-order-tag');

    // Register routes - they define their own paths
    // IMPORTANT: Order matters! More specific routes MUST come before wildcards

    // Admin routes (more specific paths first)
    this.router.use(this.path, getOrderMetricsRouter); // GET /orders/admin/orders/metrics
    this.router.use(this.path, getDraftOrdersRouter); // GET /orders/admin/orders/drafts
    this.router.use(this.path, confirmDraftOrderRouter); // POST /orders/admin/orders/drafts/:id/confirm
    this.router.use(this.path, updateFulfillmentStatusRouter); // PUT /orders/admin/orders/:id/fulfillment
    this.router.use(this.path, updatePaymentStatusRouter); // PUT /orders/admin/orders/:id/payment
    this.router.use(this.path, updateTrackingRouter); // PUT /orders/admin/orders/:id/tracking

    // Abandoned cart routes (specific paths before wildcards)
    this.router.use(this.path, getAbandonedCartMetricsRouter); // GET /admin/abandoned-carts/metrics
    this.router.use(this.path, getEmailTemplatesRouter); // GET /admin/abandoned-carts/email-templates
    this.router.use(this.path, sendAbandonedCartEmailsRouter); // POST /admin/abandoned-carts/send-email
    this.router.use(this.path, getAbandonedCartDetailsRouter); // GET /admin/abandoned-carts/:cartId
    this.router.use(this.path, getAbandonedCartsRouter); // GET /admin/abandoned-carts

    // Phase 3: Enhanced order management routes (specific paths first)
    this.router.use(this.path, searchProductsRouter); // GET /admin/orders/products/search
    this.router.use(this.path, getOrderTagsRouter); // GET /admin/orders/tags
    this.router.use(this.path, createOrderTagRouter); // POST /admin/orders/tags
    this.router.use(this.path, duplicateOrderRouter); // POST /admin/orders/:orderId/duplicate
    this.router.use(this.path, deleteOrdersRouter); // DELETE /admin/orders

    this.router.use(this.path, getAdminOrdersRouter); // GET /admin/orders
    this.router.use(this.path, getAdminOrderByIdRouter); // GET /admin/orders/:id
    this.router.use(this.path, updateOrderRouter); // PUT /admin/orders/:id
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
