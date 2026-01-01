/**
 * Audit Queries
 * Database queries for audit feature
 * Uses the audit service for all operations
 */

import { auditService } from '../services/audit.service';
import { AuditLogData, AuditLogFilters, AuditLog, AuditResourceType } from './types';

/**
 * Create an audit log entry
 */
export const createAuditLog = async (data: AuditLogData): Promise<void> => {
  await auditService.log(data);
};

/**
 * Query audit logs with filters
 */
export const queryAuditLogs = async (filters: AuditLogFilters): Promise<AuditLog[]> => {
  return auditService.queryLogs(filters);
};

/**
 * Get audit trail for a specific resource
 */
export const getResourceAuditTrail = async (
  resourceType: AuditResourceType,
  resourceId: number | string,
  limit?: number
): Promise<AuditLog[]> => {
  return auditService.getAuditTrail(resourceType, resourceId, limit);
};

/**
 * Get activity history for a specific user
 */
export const getUserActivityHistory = async (
  userId: string,
  limit?: number
): Promise<AuditLog[]> => {
  return auditService.getUserActivity(userId, limit);
};
