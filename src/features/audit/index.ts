/**
 * Audit Feature Index
 *
 * Central exports for all audit-related functionality
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

// Main route export
export default AuditRoute;

// Individual API routes
export { default as getAuditLogsRouter } from './apis/get-audit-logs';
export { default as getResourceHistoryRouter } from './apis/get-resource-history';
export { default as getUserActivityRouter } from './apis/get-user-activity';

// Services
export { auditService, AuditService } from './services/audit.service';

// Shared resources
export {
  auditLogs,
  type AuditLog,
  type NewAuditLog,
} from './shared/schema';

export {
  AuditAction,
  AuditResourceType,
  type AuditLogData,
  type AuditLogFilters,
  type SanitizedAuditData,
  type AuditContext,
} from './shared/types';

export {
  createAuditLog,
  queryAuditLogs,
  getResourceAuditTrail,
  getUserActivityHistory,
} from './shared/queries';
