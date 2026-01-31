/**
 * Dashboard Feature Index
 *
 * Central exports for dashboard-related functionality.
 */

import { Router } from 'express';
import Route from '../../interfaces/route.interface';

class DashboardRoute implements Route {
    public path = '/dashboard';
    public router = Router();

    constructor() {
        this.initializeRoutes();
    }

    private async initializeRoutes() {
        const { default: getStatsRouter } = await import('./apis/get-stats');

        // Register routes
        this.router.use(this.path, getStatsRouter);  // GET /dashboard/stats
    }
}

export default DashboardRoute;
