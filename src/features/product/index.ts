/**
 * Product Feature Index
 *
 * Central exports for all product-related functionality.
 */

import { Router } from 'express';
// import Route from '../../interfaces/route.interface'; // Uncomment when Route interface is available or confirmed location

class ProductRoute {
    public path = '/products';
    public router = Router();

    constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes() {
        // defined later
    }
}

export default ProductRoute;

// Shared resources
export * from './shared';
