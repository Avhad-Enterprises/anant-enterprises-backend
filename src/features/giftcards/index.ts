/**
 * Gift Cards Feature Index
 */

import { Router } from 'express';

class GiftCardRoute {
    public path = '/giftcards';
    public router = Router();

    constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes() {
        // API routes will be defined later
    }
}

export default GiftCardRoute;

// Shared resources
export * from './shared';
