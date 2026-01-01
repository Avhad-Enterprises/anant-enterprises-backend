/**
 * Discount Feature Index
 *
 * Central exports for all discount-related functionality.
 */

import { Router } from 'express';

class DiscountRoute {
    public path = '/discounts';
    public router = Router();

    constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes() {
        // defined later
    }
}

export default DiscountRoute;

// Shared resources
export * from './shared';
