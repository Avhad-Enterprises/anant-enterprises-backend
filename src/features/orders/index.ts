/**
 * Orders Feature Index
 */

import { Router } from 'express';

class OrdersRoute {
    public path = '/orders';
    public router = Router();

    constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes() {
        // API routes will be defined later
    }
}

export default OrdersRoute;

// Shared resources
export * from './shared';
