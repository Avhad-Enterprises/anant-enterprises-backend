/**
 * RBAC Feature Index
 *
 * Central exports for all RBAC-related functionality
 * NOTE: API routers use dynamic imports to avoid circular dependency with middlewares
 */

import { Router } from 'express';
import Route from '../../interfaces/route.interface';

class RBACRoute implements Route {
  public path = '/rbac';
  public router = Router();

  constructor() {
    this.initializeRoutes();
  }

  private async initializeRoutes() {
    // Dynamic imports to avoid circular dependency
    const { default: getRolesRouter } = await import('./apis/get-roles');
    const { default: createRoleRouter } = await import('./apis/create-role');
    const { default: updateRoleRouter } = await import('./apis/update-role');
    const { default: deleteRoleRouter } = await import('./apis/delete-role');
    const { default: rolePermissionsRouter } = await import('./apis/role-permissions');
    const { default: bulkPermissionsRouter } = await import('./apis/bulk-permissions');
    const { default: getPermissionsRouter } = await import('./apis/get-permissions');
    const { default: createPermissionRouter } = await import('./apis/create-permission');
    const { default: userRolesRouter } = await import('./apis/user-roles');

    // Role management: /api/rbac/roles
    this.router.use(`${this.path}/roles`, getRolesRouter);
    this.router.use(`${this.path}/roles`, createRoleRouter);
    this.router.use(`${this.path}/roles`, updateRoleRouter);
    this.router.use(`${this.path}/roles`, deleteRoleRouter);
    this.router.use(`${this.path}/roles`, rolePermissionsRouter);
    this.router.use(`${this.path}/roles`, bulkPermissionsRouter);

    // Permission management: /api/rbac/permissions
    this.router.use(`${this.path}/permissions`, getPermissionsRouter);
    this.router.use(`${this.path}/permissions`, createPermissionRouter);

    // User role management: /api/rbac/users
    this.router.use(`${this.path}/users`, userRolesRouter);
  }
}

// Main route export
export default RBACRoute;

// Services - SAFE to export (no circular dependency)
export { rbacCacheService, RBACCacheService } from './services/rbac-cache.service';

// Shared resources - SAFE to export
export * from './shared/rbac.schema';
export * from './shared/interface';
export * from './shared/queries';

// Seed data and functions - SAFE to export
export { SYSTEM_ROLES, INITIAL_PERMISSIONS, ROLE_PERMISSIONS_MAP, seedRBAC } from './seed';
