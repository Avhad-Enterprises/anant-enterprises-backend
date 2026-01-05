/**
 * Reviews Feature Index
 *
 * Central exports for all reviews-related functionality.
 * NOTE: API routers use dynamic imports to avoid circular dependency with middlewares
 */

import { Router } from 'express';
import Route from '../../interfaces/route.interface';

class ReviewRoute implements Route {
    public path = '/reviews';
    public router = Router();

    constructor() {
        this.initializeRoutes();
    }

    private async initializeRoutes() {
        // Dynamic imports to avoid circular dependency
        const { default: createReviewRouter } = await import('./apis/create-review');
        const { default: getUserReviewsRouter } = await import('./apis/get-user-reviews');
        const { default: voteHelpfulRouter } = await import('./apis/vote-helpful');
        const { default: getAdminReviewsRouter } = await import('./apis/get-admin-reviews');
        const { default: moderateReviewRouter } = await import('./apis/moderate-review');

        // Register routes
        // CRITICAL: Register specific routes BEFORE parameterized routes
        this.router.use(this.path, getAdminReviewsRouter);   // GET /reviews/admin/reviews
        this.router.use(this.path, moderateReviewRouter);    // PUT /reviews/admin/reviews/:id
        this.router.use(this.path, getUserReviewsRouter);    // GET /reviews/me
        this.router.use(this.path, voteHelpfulRouter);       // POST /reviews/:id/helpful
        this.router.use(this.path, createReviewRouter);      // POST /reviews
    }
}

export default ReviewRoute;

// Shared resources
export * from './shared';
