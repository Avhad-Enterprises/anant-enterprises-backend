/**
 * Audit Feature Index
 *
 * Central exports
 * NOTE: API routers use dynamic imports to avoid circular dependency with middlewares for all audit-related functionality
 */

import { Router } from 'express';
import Route from '../../interfaces/route.interface';

class AuditRoute implements Route {
    public path = '/admin/audit';
    public router = Router();

    constructor() {
        this.initializeRoutes();
    }

    private async initializeRoutes() {
    // Dynamic imports to avoid circular dependency
    const { default: getAuditLogsRouter } = await import('./apis/get-audit-logs');
    const { default: getResourceHistoryRouter } = await import('./apis/get-resource-history');
    const { default: getUserActivityRouter } = await import('./apis/get-user-activity');

        // Audit query endpoints: /api/admin/audit/*
        this.router.use(`${this.path}/logs`, getAuditLogsRouter);
        this.router.use(`${this.path}/resource`, getResourceHistoryRouter);
        this.router.use(`${this.path}/user`, getUserActivityRouter);
    }
}

// Main route export
export default AuditRoute;

// Individual API routes

// Services - SAFE to export
export { auditService, AuditService } from './services/audit.service';

// Shared resources - SAFE to export
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
