/**
 * Upload Feature Index
 *
 * Central exports for all upload-related functionality
 */

import { Router } from 'express';
import Route from '../../interfaces/route.interface';
import createUploadRouter from './apis/create-upload';
import getUploadsRouter from './apis/get-uploads';
import updateUploadRouter from './apis/update-upload';
import deleteUploadRouter from './apis/delete-upload';
import uploadStatsRouter from './apis/upload-stats';
import downloadFileRouter from './apis/download-file';

class UploadRoute implements Route {
  public path = '/uploads';
  public router = Router();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
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
export { default as createUploadRouter } from './apis/create-upload';
export { default as getUploadsRouter } from './apis/get-uploads';
export { default as updateUploadRouter } from './apis/update-upload';
export { default as deleteUploadRouter } from './apis/delete-upload';
export { default as uploadStatsRouter } from './apis/upload-stats';
export { default as downloadFileRouter } from './apis/download-file';

// Shared resources
export {
  uploads,
  uploadStatuses,
  type UploadStatus,
  type Upload as DrizzleUpload,
  type NewUpload
} from './shared/schema';
export {
  type Upload,
  type UploadUpdateInput,
  type UploadStats,
  convertUpload
} from './shared/interface';
export {
  findUploadById,
  findUploadByIdAdmin
} from './shared/queries';
