/**
 * Core Audit Service
 * 
 * Provides functionality for:
 * - Logging audit events with automatic context enrichment
 * - Querying audit trails for resources
 * - Retrieving user activity history
 * - Sanitizing sensitive data
 */

import { db } from '../../../database/drizzle';
import { auditLogs } from '../shared/schema';
import { users } from '../../user/shared/schema';
import { eq, and, desc, gte, lte, inArray, SQL } from 'drizzle-orm';
import { logger } from '../../../utils/logging/logger';
import { rbacCacheService } from '../../rbac/services/rbac-cache.service';
import type {
    AuditLogData,
    AuditLog,
    AuditLogFilters,
    AuditContext,
    AuditResourceType,
} from '../shared/types';

/**
 * Fields to exclude from audit logging (sensitive data)
 */
const SENSITIVE_FIELDS = [
    'password',
    'password_hash',
    'temp_password_encrypted',
    'invite_token',
    'session_token',
    'refresh_token',
    'refreshtoken',
    'access_token',
    'accesstoken',
    'token',
];

/**
 * Audit Service Class
 * Manages all audit logging operations
 */
class AuditService {
    /**
     * Log an audit event
     * 
     * @param data - Audit log data
     * @param context - Optional request context (can override data fields)
     */
    async log(data: AuditLogData, context?: AuditContext): Promise<void> {
        try {
            // Merge context if provided
            const enrichedData = this.enrichWithContext(data, context);

            // Sanitize sensitive data
            const sanitizedOldValues = enrichedData.oldValues
                ? this.sanitizeData(enrichedData.oldValues)
                : null;
            const sanitizedNewValues = enrichedData.newValues
                ? this.sanitizeData(enrichedData.newValues)
                : null;

            // Fetch user details if userId is provided but email/role are missing
            if (enrichedData.userId && (!enrichedData.userEmail || !enrichedData.userRole)) {
                const user = await this.getUserDetails(enrichedData.userId);
                if (user) {
                    enrichedData.userEmail = enrichedData.userEmail || user.email;
                    const userRole = await this.getUserRole(enrichedData.userId);
                    enrichedData.userRole = enrichedData.userRole || (userRole ?? undefined);
                }
            }

            // Insert audit log
            await db.insert(auditLogs).values({
                user_id: enrichedData.userId ?? null,
                user_email: enrichedData.userEmail ?? null,
                user_role: enrichedData.userRole ?? null,
                action: enrichedData.action,
                resource_type: enrichedData.resourceType,
                resource_id: typeof enrichedData.resourceId === 'number'
                    ? enrichedData.resourceId
                    : enrichedData.resourceId
                        ? parseInt(String(enrichedData.resourceId), 10)
                        : null,
                old_values: sanitizedOldValues,
                new_values: sanitizedNewValues,
                ip_address: enrichedData.ipAddress ?? null,
                user_agent: enrichedData.userAgent ?? null,
                session_id: enrichedData.sessionId ?? null,
                metadata: enrichedData.metadata ?? null,
                reason: enrichedData.reason ?? null,
            });

            logger.info('Audit log created', {
                action: enrichedData.action,
                resourceType: enrichedData.resourceType,
                resourceId: enrichedData.resourceId,
                userId: enrichedData.userId,
            });
        } catch (error) {
            // Log the error but don't throw - audit logging should never break the main flow
            logger.error('Failed to create audit log', { error, data });
        }
    }

    /**
     * Get audit trail for a specific resource
     * 
     * @param resourceType - Type of resource
     * @param resourceId - ID of the resource
     * @param limit - Maximum number of records to return
     */
    async getAuditTrail(
        resourceType: AuditResourceType,
        resourceId: number | string,
        limit: number = 50
    ): Promise<AuditLog[]> {
        try {
            const resourceIdNum = typeof resourceId === 'number'
                ? resourceId
                : parseInt(String(resourceId), 10);

            const logs = await db
                .select()
                .from(auditLogs)
                .where(
                    and(
                        eq(auditLogs.resource_type, resourceType),
                        eq(auditLogs.resource_id, resourceIdNum)
                    )
                )
                .orderBy(desc(auditLogs.timestamp))
                .limit(limit);

            // Transform snake_case to camelCase for API responses
            const transformedLogs = logs.map(log => ({
                id: log.id,
                timestamp: log.timestamp,
                userId: log.user_id,
                userEmail: log.user_email,
                userRole: log.user_role,
                action: log.action,
                resourceType: log.resource_type,
                resourceId: log.resource_id,
                oldValues: log.old_values,
                newValues: log.new_values,
                ipAddress: log.ip_address,
                userAgent: log.user_agent,
                sessionId: log.session_id,
                metadata: log.metadata,
                reason: log.reason,
                createdAt: log.created_at,
            }));

            return transformedLogs as AuditLog[];
        } catch (error) {
            logger.error('Failed to fetch audit trail', { error, resourceType, resourceId });
            return [];
        }
    }

    /**
     * Get all activity performed by a specific user
     * 
     * @param userId - ID of the user
     * @param limit - Maximum number of records to return
     */
    async getUserActivity(userId: number, limit: number = 100): Promise<AuditLog[]> {
        try {
            const logs = await db
                .select()
                .from(auditLogs)
                .where(eq(auditLogs.user_id, userId))
                .orderBy(desc(auditLogs.timestamp))
                .limit(limit);

            // Transform snake_case to camelCase for API responses
            const transformedLogs = logs.map(log => ({
                id: log.id,
                timestamp: log.timestamp,
                userId: log.user_id,
                userEmail: log.user_email,
                userRole: log.user_role,
                action: log.action,
                resourceType: log.resource_type,
                resourceId: log.resource_id,
                oldValues: log.old_values,
                newValues: log.new_values,
                ipAddress: log.ip_address,
                userAgent: log.user_agent,
                sessionId: log.session_id,
                metadata: log.metadata,
                reason: log.reason,
                createdAt: log.created_at,
            }));

            return transformedLogs as AuditLog[];
        } catch (error) {
            logger.error('Failed to fetch user activity', { error, userId });
            return [];
        }
    }

    /**
     * Query audit logs with filters
     * 
     * @param filters - Filter criteria
     */
    async queryLogs(filters: AuditLogFilters): Promise<AuditLog[]> {
        try {
            const conditions: SQL[] = [];

            // Build WHERE conditions
            if (filters.userId) {
                conditions.push(eq(auditLogs.user_id, filters.userId));
            }

            if (filters.action) {
                if (Array.isArray(filters.action)) {
                    conditions.push(inArray(auditLogs.action, filters.action as string[]));
                } else {
                    conditions.push(eq(auditLogs.action, filters.action));
                }
            }

            if (filters.resourceType) {
                if (Array.isArray(filters.resourceType)) {
                    conditions.push(inArray(auditLogs.resource_type, filters.resourceType as string[]));
                } else {
                    conditions.push(eq(auditLogs.resource_type, filters.resourceType));
                }
            }

            if (filters.resourceId) {
                const resourceIdNum = typeof filters.resourceId === 'number'
                    ? filters.resourceId
                    : parseInt(String(filters.resourceId), 10);
                conditions.push(eq(auditLogs.resource_id, resourceIdNum));
            }

            if (filters.startDate) {
                conditions.push(gte(auditLogs.timestamp, filters.startDate));
            }

            if (filters.endDate) {
                conditions.push(lte(auditLogs.timestamp, filters.endDate));
            }

            if (filters.ipAddress) {
                conditions.push(eq(auditLogs.ip_address, filters.ipAddress));
            }

            // Execute query
            let query = db
                .select()
                .from(auditLogs)
                .orderBy(desc(auditLogs.timestamp));

            if (conditions.length > 0) {
                query = query.where(and(...conditions)) as typeof query;
            }

            if (filters.limit) {
                query = query.limit(filters.limit) as typeof query;
            }

            if (filters.offset) {
                query = query.offset(filters.offset) as typeof query;
            }

            const logs = await query;
            
            // Transform snake_case to camelCase for API responses
            const transformedLogs = logs.map(log => ({
                id: log.id,
                timestamp: log.timestamp,
                userId: log.user_id,
                userEmail: log.user_email,
                userRole: log.user_role,
                action: log.action,
                resourceType: log.resource_type,
                resourceId: log.resource_id,
                oldValues: log.old_values,
                newValues: log.new_values,
                ipAddress: log.ip_address,
                userAgent: log.user_agent,
                sessionId: log.session_id,
                metadata: log.metadata,
                reason: log.reason,
                createdAt: log.created_at,
            }));

            return transformedLogs as AuditLog[];
        } catch (error) {
            logger.error('Failed to query audit logs', { error, filters });
            return [];
        }
    }

    /**
     * Sanitize data by removing sensitive fields
     * 
     * @param data - Data object to sanitize
     * @returns Sanitized data
     */
    private sanitizeData(data: Record<string, any>): Record<string, any> {
        const sanitized: Record<string, any> = {};

        for (const [key, value] of Object.entries(data)) {
            if (SENSITIVE_FIELDS.includes(key.toLowerCase())) {
                sanitized[key] = '[REDACTED]';
            } else if (value && typeof value === 'object' && !Array.isArray(value)) {
                // Recursively sanitize nested objects
                sanitized[key] = this.sanitizeData(value);
            } else {
                sanitized[key] = value;
            }
        }

        return sanitized;
    }

    /**
     * Enrich audit data with request context
     * 
     * @param data - Original audit data
     * @param context - Request context
     * @returns Enriched audit data
     */
    private enrichWithContext(data: AuditLogData, context?: AuditContext): AuditLogData {
        if (!context) return data;

        return {
            ...data,
            userId: data.userId ?? context.userId,
            userEmail: data.userEmail ?? context.userEmail,
            userRole: data.userRole ?? context.userRole,
            ipAddress: data.ipAddress ?? context.ipAddress,
            userAgent: data.userAgent ?? context.userAgent,
            sessionId: data.sessionId ?? context.sessionId,
        };
    }

    /**
     * Get user details from database
     * 
     * @param userId - User ID
     * @returns User details or null
     */
    private async getUserDetails(userId: number): Promise<{ email: string } | null> {
        try {
            const [user] = await db
                .select({ email: users.email })
                .from(users)
                .where(eq(users.id, userId))
                .limit(1);

            return user ?? null;
        } catch (error) {
            logger.warn('Failed to fetch user details for audit', { error, userId });
            return null;
        }
    }

    /**
     * Get user role(s) from RBAC system
     * 
     * @param userId - User ID
     * @returns Comma-separated role names
     */
    private async getUserRole(userId: number): Promise<string | null> {
        try {
            const roles = await rbacCacheService.getUserRoles(userId);
            return roles.length > 0 ? roles.map(role => role.name).join(', ') : null;
        } catch (error) {
            logger.warn('Failed to fetch user roles for audit', { error, userId });
            return null;
        }
    }
}

// Export singleton instance
export const auditService = new AuditService();

// Export class for testing
export { AuditService };
