/**
 * Upload Feature Index
 *
 * Central exports
 * NOTE: API routers use dynamic imports to avoid circular dependency with middlewares for all upload-related functionality
 */

import { Router } from 'express';
import Route from '../../interfaces/route.interface';

class UploadRoute implements Route {
  public path = '/uploads';
  public router = Router();

  constructor() {
    this.initializeRoutes();
  }

  private async initializeRoutes() {
    // Dynamic imports to avoid circular dependency
    const { default: uploadStatsRouter } = await import('./apis/upload-stats');
    const { default: createUploadRouter } = await import('./apis/create-upload');
    const { default: getUploadsRouter } = await import('./apis/get-uploads');
    const { default: updateUploadRouter } = await import('./apis/update-upload');
    const { default: deleteUploadRouter } = await import('./apis/delete-upload');
    const { default: downloadFileRouter } = await import('./apis/download-file');

    // Mount all upload routes
    // Note: stats must be before /:id routes to match /stats correctly
    this.router.use(this.path, uploadStatsRouter);
    this.router.use(this.path, createUploadRouter);
    this.router.use(this.path, getUploadsRouter);
    this.router.use(this.path, updateUploadRouter);
    this.router.use(this.path, deleteUploadRouter);
    this.router.use(this.path, downloadFileRouter);
  }
}

// Main route export
export default UploadRoute;

// Individual API routes

// Shared resources - SAFE to export
export {
  uploads,
  uploadStatuses,
  type UploadStatus,
  type Upload as DrizzleUpload,
  type NewUpload,
} from './shared/schema';
export {
  type Upload,
  type UploadUpdateInput,
  type UploadStats,
  convertUpload,
} from './shared/interface';
export { findUploadById, findUploadByIdAdmin } from './shared/queries';
