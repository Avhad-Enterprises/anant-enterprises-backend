/**
 * Blog Feature Index
 *
 * Central exports for all blog-related functionality.
 */

import { Router } from 'express';
import getAllBlogsRouter from './apis/get-all-blogs';
import getBlogByIdRouter from './apis/get-blog-by-id';
import getBlogBySlugRouter from './apis/get-blog-by-slug';
import createBlogRouter from './apis/create-blog';
import updateBlogRouter from './apis/update-blog';
import deleteBlogRouter from './apis/delete-blog';
import bulkDeleteBlogsRouter from './apis/bulk-delete-blogs';
import importBlogsRouter from './apis/import-blogs';
import exportBlogsRouter from './apis/export-blogs';

class BlogRoute {
  public path = '/blogs';
  public router = Router();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // Import and export routes must come before parametrized routes
    this.router.use(`${this.path}/import`, importBlogsRouter);
    this.router.use(`${this.path}/export`, exportBlogsRouter);
    
    this.router.use(this.path, getAllBlogsRouter);
    this.router.use(this.path, getBlogByIdRouter);
    this.router.use(this.path, getBlogBySlugRouter);
    this.router.use(this.path, createBlogRouter);
    this.router.use(this.path, updateBlogRouter);
    this.router.use(this.path, deleteBlogRouter);
    this.router.use(this.path, bulkDeleteBlogsRouter);
  }
}

export default BlogRoute;

// Shared resources
export * from './shared';
