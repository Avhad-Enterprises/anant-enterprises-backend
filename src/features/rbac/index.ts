/**
 * RBAC Routes
 * Combines all RBAC API endpoints
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

export default RBACRoute;
