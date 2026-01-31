/**
 * Tags Feature Index
 *
 * Central exports for all tags-related functionality.
 */

import { Router } from 'express';
import Route from '../../interfaces/route.interface';

class TagRoute implements Route {
  public path = '/tags';
  public router = Router();

  constructor() {
    this.initializeRoutes();
  }

  private async initializeRoutes() {
    const { default: createTagRouter } = await import('./apis/create-tag');
    const { default: getTagsRouter } = await import('./apis/get-tags');
    const { default: getTagByIdRouter } = await import('./apis/get-tag-by-id');
    const { default: updateTagRouter } = await import('./apis/update-tag');
    const { default: deleteTagRouter } = await import('./apis/delete-tag');
    const { default: importTagsRouter } = await import('./apis/import-tags');
    const { default: exportTagsRouter } = await import('./apis/export-tags');
    const { default: bulkDeleteTagsRouter } = await import('./apis/bulk-delete-tags');

    // Register routes in order
    this.router.use(this.path, bulkDeleteTagsRouter); // POST /tags/bulk-delete
    this.router.use(`${this.path}/import`, importTagsRouter); // POST /tags/import
    this.router.use(`${this.path}/export`, exportTagsRouter); // POST /tags/export
    this.router.use(this.path, createTagRouter);      // POST /tags
    this.router.use(this.path, getTagsRouter);         // GET /tags
    this.router.use(this.path, getTagByIdRouter);      // GET /tags/:id
    this.router.use(this.path, updateTagRouter);       // PUT /tags/:id
    this.router.use(this.path, deleteTagRouter);       // DELETE /tags/:id
  }
}

export default TagRoute;

// Shared resources
export * from './shared';

// Services
export * from './services/tag-sync.service';
