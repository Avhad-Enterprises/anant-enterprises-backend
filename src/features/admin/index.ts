/**
 * Admin Feature Module
 *
 * Handles admin/staff user management and profiles.
 * All permissions are managed via RBAC system.
 * NOTE: API routers use dynamic imports to avoid circular dependency with middlewares
 */

import { Router } from 'express';
import Route from '../../interfaces/route.interface';

class AdminRoute implements Route {
  public path = '/admins';
  public router = Router();

  constructor() {
    this.initializeRoutes();
  }

  private async initializeRoutes() {
    // Dynamic imports to avoid circular dependency
    const { default: getAllAdminsRouter } = await import('./apis/get-all-admins');
    const { default: createAdminRouter } = await import('./apis/create-admin');
    const { default: getAdminByIdRouter } = await import('./apis/get-admin-by-id');
    const { default: updateAdminRouter } = await import('./apis/update-admin');
    const { default: deleteAdminRouter } = await import('./apis/delete-admin');

    // Static routes BEFORE dynamic :id routes
    this.router.use(this.path, getAllAdminsRouter);      // GET /admins
    this.router.use(this.path, createAdminRouter);       // POST /admins
    
    // Dynamic ID routes LAST
    this.router.use(this.path, getAdminByIdRouter);      // GET /admins/:id
    this.router.use(this.path, updateAdminRouter);       // PATCH /admins/:id
    this.router.use(this.path, deleteAdminRouter);       // DELETE /admins/:id
  }
}

// Main route export
export default AdminRoute;

// ============================================
// SHARED EXPORTS
// ============================================

export * from './shared/admin-profiles.schema';
