/**
 * Blog Feature Index
 *
 * Central exports for all blog-related functionality.
 */

import { Router } from 'express';
import getAllBlogsRouter from './apis/get-all-blogs';
import getBlogByIdRouter from './apis/get-blog-by-id';
import createBlogRouter from './apis/create-blog';
import updateBlogRouter from './apis/update-blog';
import deleteBlogRouter from './apis/delete-blog';
import bulkDeleteBlogsRouter from './apis/bulk-delete-blogs';

class BlogRoute {
  public path = '/blogs';
  public router = Router();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.use(this.path, getAllBlogsRouter);
    this.router.use(this.path, getBlogByIdRouter);
    this.router.use(this.path, createBlogRouter);
    this.router.use(this.path, updateBlogRouter);
    this.router.use(this.path, deleteBlogRouter);
    this.router.use(this.path, bulkDeleteBlogsRouter);
  }
}

export default BlogRoute;

// Shared resources
export * from './shared';
