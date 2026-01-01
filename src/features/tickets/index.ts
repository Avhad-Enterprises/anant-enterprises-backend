/**
 * Tickets Feature Index
 */

import { Router } from 'express';

class TicketsRoute {
    public path = '/tickets';
    public router = Router();

    constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes() {
        // API routes will be defined later
    }
}

export default TicketsRoute;

// Shared resources
export * from './shared';
