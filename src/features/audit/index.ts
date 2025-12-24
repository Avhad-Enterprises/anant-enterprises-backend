/**
 * Audit Routes
 * Combines all audit API endpoints
 */

import { Router } from 'express';
import Route from '../../interfaces/route.interface';
import getAuditLogsRouter from './apis/get-audit-logs';
import getResourceHistoryRouter from './apis/get-resource-history';
import getUserActivityRouter from './apis/get-user-activity';

class AuditRoute implements Route {
    public path = '/admin/audit';
    public router = Router();

    constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes() {
        // Audit query endpoints: /api/admin/audit/*
        this.router.use(`${this.path}/logs`, getAuditLogsRouter);
        this.router.use(`${this.path}/resource`, getResourceHistoryRouter);
        this.router.use(`${this.path}/user`, getUserActivityRouter);
    }
}

export default AuditRoute;
