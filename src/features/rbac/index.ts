/**
 * RBAC Feature Index
 *
 * Central exports for all RBAC-related functionality
 */

import { Router } from 'express';
import Route from '../../interfaces/route.interface';
import getRolesRouter from './apis/get-roles';
import createRoleRouter from './apis/create-role';
import updateRoleRouter from './apis/update-role';
import deleteRoleRouter from './apis/delete-role';
import getPermissionsRouter from './apis/get-permissions';
import createPermissionRouter from './apis/create-permission';
import rolePermissionsRouter from './apis/role-permissions';
import bulkPermissionsRouter from './apis/bulk-permissions';
import userRolesRouter from './apis/user-roles';

class RBACRoute implements Route {
    public path = '/rbac';
    public router = Router();

    constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes() {
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

// Individual API routes
export { default as getRolesRouter } from './apis/get-roles';
export { default as createRoleRouter } from './apis/create-role';
export { default as updateRoleRouter } from './apis/update-role';
export { default as deleteRoleRouter } from './apis/delete-role';
export { default as getPermissionsRouter } from './apis/get-permissions';
export { default as createPermissionRouter } from './apis/create-permission';
export { default as rolePermissionsRouter } from './apis/role-permissions';
export { default as bulkPermissionsRouter } from './apis/bulk-permissions';
export { default as userRolesRouter } from './apis/user-roles';

// Services
export { rbacCacheService, RBACCacheService } from './services/rbac-cache.service';

// Shared resources
export * from './shared/schema';
export * from './shared/interface';
export * from './shared/queries';

// Seed data and functions
export {
    SYSTEM_ROLES,
    INITIAL_PERMISSIONS,
    ROLE_PERMISSIONS_MAP,
    seedRBAC
} from './seed';
