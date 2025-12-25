/**
 * GET /api/admin/audit/logs
 * Get audit logs with advanced filtering and pagination
 * Admin-only access
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth } from '../../../middlewares';
import { requirePermission } from '../../../middlewares';
import { validationMiddleware } from '../../../middlewares';
import { ResponseFormatter } from '../../../utils';
import { auditService } from '../services/audit.service';
import { AuditAction, AuditResourceType, AuditLogFilters } from '../shared/types';

// Validation schema for query parameters
const querySchema = z.object({
    userId: z.coerce.number().int().positive().optional(),
    action: z.string().optional(),
    resourceType: z.nativeEnum(AuditResourceType).optional(),
    resourceId: z.union([z.coerce.number().int(), z.string()]).optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    ipAddress: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(500).default(50),
    offset: z.coerce.number().int().min(0).default(0) });

const handler =(async (req: RequestWithUser, res: Response) => {
    // Validation middleware ensures these are the correct types
    // Cast to validated type after validation middleware
    type ValidatedQuery = z.infer<typeof querySchema>;
    const query = req.query as unknown as ValidatedQuery;
    
    const filters: AuditLogFilters = {
        limit: query.limit,
        offset: query.offset };

    if (query.userId) filters.userId = query.userId;
    if (query.resourceType) filters.resourceType = query.resourceType;
    if (query.resourceId) filters.resourceId = query.resourceId;
    if (query.startDate) filters.startDate = query.startDate;
    if (query.endDate) filters.endDate = query.endDate;
    if (query.ipAddress) filters.ipAddress = query.ipAddress;

    // Handle multiple actions (comma-separated)
    if (query.action) {
        const actionStr = query.action;
        const actions = actionStr.split(',').map((a: string) => a.trim());
        filters.action = actions.length === 1 ? actions[0] as AuditAction : actions as AuditAction[];
    }

    // Query audit logs
    const logs = await auditService.queryLogs(filters);

    ResponseFormatter.success(res, {
        logs,
        pagination: {
            limit: filters.limit,
            offset: filters.offset,
            count: logs.length } }, 'Audit logs retrieved successfully');
});

const router = Router();
router.get(
    '/',
    requireAuth,
    requirePermission('audit:read'),
    validationMiddleware(querySchema, 'query'),
    handler
);

export default router;
