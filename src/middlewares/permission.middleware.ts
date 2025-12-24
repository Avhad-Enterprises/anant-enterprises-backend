/**
 * Permission Middleware
 *
 * Dynamic permission-based authorization middleware for the RBAC system.
 * Replaces static role-based checks with granular permission checks.
 */

import { NextFunction, Response, Request } from 'express';
import { HttpException } from '../utils';
import { logger } from '../utils';
import { rbacCacheService } from '../features/rbac';
import '../interfaces/request.interface';

/**
 * Permission-based authorization middleware
 * Requires user to have ALL specified permissions
 *
 * Usage:
 *   requirePermission('users:read')
 *   requirePermission(['users:read', 'users:update'])
 */
export const requirePermission = (requiredPermissions: string | string[]) => {
    const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];

    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            if (!req.userId) {
                return next(new HttpException(401, 'Authentication required'));
            }

            // Check if user has all required permissions
            const hasAllPermissions = await rbacCacheService.hasAllPermissions(req.userId, permissions);

            if (!hasAllPermissions) {
                logger.warn('Permission denied', {
                    userId: req.userId,
                    requiredPermissions: permissions,
                    url: req.originalUrl,
                    method: req.method,
                });
                return next(new HttpException(403, 'Insufficient permissions'));
            }

            logger.debug('Permission granted', {
                userId: req.userId,
                permissions: permissions,
            });

            next();
        } catch (error) {
            logger.error('Permission check error:', error);
            next(new HttpException(403, 'Authorization failed'));
        }
    };
};

/**
 * Permission-based authorization middleware
 * Requires user to have ANY of the specified permissions
 *
 * Usage:
 *   requireAnyPermission(['admin:system', 'users:read'])
 */
export const requireAnyPermission = (requiredPermissions: string[]) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            if (!req.userId) {
                return next(new HttpException(401, 'Authentication required'));
            }

            // Check if user has any of the required permissions
            const hasAnyPermission = await rbacCacheService.hasAnyPermission(req.userId, requiredPermissions);

            if (!hasAnyPermission) {
                logger.warn('Permission denied (any)', {
                    userId: req.userId,
                    requiredPermissions,
                    url: req.originalUrl,
                    method: req.method,
                });
                return next(new HttpException(403, 'Insufficient permissions'));
            }

            next();
        } catch (error) {
            logger.error('Permission check error:', error);
            next(new HttpException(403, 'Authorization failed'));
        }
    };
};

/**
 * Check ownership or permission
 * Allows access if user owns the resource OR has the specified permission
 *
 * Usage (in route handler):
 *   requireOwnershipOrPermission(resourceUserId, 'users:update')
 */
export const checkOwnershipOrPermission = async (
    req: Request,
    resourceOwnerId: number,
    permission: string
): Promise<boolean> => {
    if (!req.userId) {
        return false;
    }

    // Owner always has access
    if (req.userId === resourceOwnerId) {
        return true;
    }

    // Check if user has the permission
    return rbacCacheService.hasPermission(req.userId, permission);
};

/**
 * Middleware factory for ownership or permission check
 * Extracts owner ID from request params
 *
 * Usage:
 *   requireOwnerOrPermission('id', 'users:update')
 */
export const requireOwnerOrPermission = (ownerIdParam: string, permission: string) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            if (!req.userId) {
                return next(new HttpException(401, 'Authentication required'));
            }

            const resourceOwnerId = parseInt(req.params[ownerIdParam], 10);

            if (isNaN(resourceOwnerId)) {
                return next(new HttpException(400, 'Invalid resource ID'));
            }

            // Owner always has access
            if (req.userId === resourceOwnerId) {
                return next();
            }

            // Check permission
            const hasPermission = await rbacCacheService.hasPermission(req.userId, permission);

            if (!hasPermission) {
                logger.warn('Ownership/Permission denied', {
                    userId: req.userId,
                    resourceOwnerId,
                    permission,
                    url: req.originalUrl,
                });
                return next(new HttpException(403, 'Access denied'));
            }

            next();
        } catch (error) {
            logger.error('Ownership/Permission check error:', error);
            next(new HttpException(403, 'Authorization failed'));
        }
    };
};

/**
 * Check if current user has a specific permission (for use in handlers)
 * Returns false if user is not authenticated
 */
export const userHasPermission = async (req: Request, permission: string): Promise<boolean> => {
    if (!req.userId) {
        return false;
    }
    return rbacCacheService.hasPermission(req.userId, permission);
};

/**
 * Get all permissions for the current user (for debugging/admin)
 */
export const getUserPermissions = async (req: Request): Promise<string[]> => {
    if (!req.userId) {
        return [];
    }
    return rbacCacheService.getUserPermissions(req.userId);
};
