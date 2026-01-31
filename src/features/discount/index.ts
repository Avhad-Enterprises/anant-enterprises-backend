/**
 * Discount Feature Index
 *
 * Central exports for all discount-related functionality.
 */

import { Router } from 'express';
import Route from '../../interfaces/route.interface';

class DiscountRoute implements Route {
  public path = '/discounts';
  public router = Router();

  constructor() {
    this.initializeRoutes();
  }

  private async initializeRoutes() {
    // Dynamic imports
    const { default: getDiscountsRouter } = await import('./apis/get-discounts');
    const { default: getDiscountByIdRouter } = await import('./apis/get-discount-by-id');
    const { default: createDiscountRouter } = await import('./apis/create-discount');
    const { default: updateDiscountRouter } = await import('./apis/update-discount');
    const { default: deleteDiscountRouter } = await import('./apis/delete-discount');
    const { default: discountActionsRouter } = await import('./apis/discount-actions');
    const { default: validateDiscountRouter } = await import('./apis/validate-discount');

    // 1. Static Routes (Validation, List, Create)
    // Must come before parameterized routes to avoid 'validate' being treated as an ID
    this.router.use(this.path, validateDiscountRouter); // POST /discounts/validate
    this.router.use(this.path, getDiscountsRouter);     // GET /discounts
    this.router.use(this.path, createDiscountRouter);   // POST /discounts

    // 2. Action Routes (using :id inside)
    this.router.use(this.path, discountActionsRouter);

    // 3. CRUD Routes (using :id)
    this.router.use(this.path, getDiscountByIdRouter);  // GET /discounts/:id
    this.router.use(this.path, updateDiscountRouter);   // PUT /discounts/:id
    this.router.use(this.path, deleteDiscountRouter);   // DELETE /discounts/:id
  }
}

export default DiscountRoute;

// Export shared resources and services
export * from './shared';
export * from './services';

