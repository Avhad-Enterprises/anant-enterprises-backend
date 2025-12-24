/**
 * Audit Utilities
 * 
 * Helper functions for extracting audit-relevant data from HTTP requests
 * IMPROVED: Automatic detection - minimal maintenance for new features!
 */

import { Request } from 'express';
import { AuditAction, AuditResourceType, AuditContext } from '../../features/audit/shared/types';

/**
 * Extract audit context from Express request
 */
export function extractRequestContext(req: Request): AuditContext {
    return {
        userId: (req as any).userId, // userId is added by auth middleware
        ipAddress: req.ip || req.connection?.remoteAddress || undefined,
        userAgent: req.get('User-Agent'),
        sessionId: req.headers['x-session-id'] as string | undefined,
    };
}

/**
 * Determine if a request should be audited
 * Excludes health checks, static assets, and system endpoints
 */
export function shouldAuditRequest(req: Request): boolean {
    const path = req.path.toLowerCase();

    // Exclude health checks
    if (path === '/health' || path === '/') {
        return false;
    }

    // Exclude static assets
    if (path.includes('/static/') || path.includes('/assets/')) {
        return false;
    }

    // Only audit API endpoints
    if (!path.startsWith('/api/')) {
        return false;
    }

    return true;
}

/**
 * Map HTTP method and path to AuditAction
 * 
 * SMART APPROACH:
 * - Special endpoints handled specifically (auth, downloads, etc.)
 * - Everything else uses generic CRUD actions (CREATE, READ, UPDATE, DELETE)
 * - NEW FEATURES WORK AUTOMATICALLY! 🎉
 */
export function getAuditActionFromRequest(req: Request): AuditAction {
    const method = req.method.toUpperCase();
    const path = req.path.toLowerCase();

    // Special case: Auth endpoints (need specific actions for security tracking)
    if (path.includes('/auth/')) {
        if (path.includes('login')) return AuditAction.LOGIN;
        if (path.includes('logout')) return AuditAction.LOGOUT;
        if (path.includes('refresh')) return AuditAction.TOKEN_REFRESH;
        if (path.includes('register')) return AuditAction.USER_CREATE;
        if (path.includes('password')) {
            if (path.includes('reset')) return AuditAction.PASSWORD_RESET;
            if (path.includes('change')) return AuditAction.PASSWORD_CHANGE;
        }
    }

    // Special case: Specific action patterns
    if (path.includes('/download')) return AuditAction.UPLOAD_DOWNLOAD;
    if (path.includes('/accept')) return AuditAction.ADMIN_INVITE_ACCEPT;
    if (path.includes('/assign')) return AuditAction.PERMISSION_ASSIGN;
    if (path.includes('/revoke')) return AuditAction.PERMISSION_REVOKE;

    // AUTOMATIC CRUD MAPPING
    // Works for ANY resource: users, products, orders, categories, etc.
    // No code changes needed for new features! ✅
    switch (method) {
        case 'GET':
            return AuditAction.READ;
        case 'POST':
            return AuditAction.CREATE;
        case 'PUT':
        case 'PATCH':
            return AuditAction.UPDATE;
        case 'DELETE':
            return AuditAction.DELETE;
        default:
            return AuditAction.READ;
    }
}

/**
 * Extract resource type from request path
 * 
 * SMART APPROACH:
 * - Automatically extracts resource name from URL
 * - Maps known resources to specific types
 * - Unknown resources use SYSTEM type (still tracked!)
 * 
 * Examples:
 *   /api/users/123 → USER
 *   /api/products/456 → SYSTEM (but still logged!)
 *   /api/orders/789 → SYSTEM (but still logged!)
 */
export function getResourceTypeFromPath(path: string): AuditResourceType {
    const lowerPath = path.toLowerCase();

    // Extract first path segment after /api/
    // Example: /api/products/123 → 'products'
    const match = lowerPath.match(/\/api\/([^\/]+)/);
    if (!match) return AuditResourceType.SYSTEM;

    const resource = match[1];

    // Map known critical resources to specific types
    // Only add here if you need specific tracking for compliance/security
    const resourceMap: Record<string, AuditResourceType> = {
        // Core Auth & Users
        'users': AuditResourceType.USER,
        'auth': AuditResourceType.AUTH,

        // RBAC
        'roles': AuditResourceType.ROLE,
        'permissions': AuditResourceType.PERMISSION,

        // Admin
        'invitations': AuditResourceType.INVITATION,
        'invite': AuditResourceType.INVITATION,

        // Files
        'uploads': AuditResourceType.UPLOAD,
        'upload': AuditResourceType.UPLOAD,

        // Chatbot
        'chatbot': AuditResourceType.CHATBOT_SESSION,

        // System
        'settings': AuditResourceType.SETTINGS,

        // NEW RESOURCES: Just leave them unmapped!
        // They'll use SYSTEM type and still be tracked properly
    };

    return resourceMap[resource] || AuditResourceType.SYSTEM;
}

/**
 * Extract resource ID from request path
 * Returns the numeric ID from paths like /api/users/123 or /api/products/456
 */
export function getResourceIdFromPath(path: string): number | undefined {
    // Match numeric IDs in path segments
    const matches = path.match(/\/(\d+)(?:\/|$)/);
    if (matches && matches[1]) {
        return parseInt(matches[1], 10);
    }
    return undefined;
}
