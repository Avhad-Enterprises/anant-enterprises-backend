/**
 * GET /api/products/slug/:slug
 * Get product detail by slug with enhanced frontend-compatible response
 * - Public can view active products
 * - Admins can view all products
 * - Includes computed fields: rating, reviews, inStock, discount
 * 
 * Phase B: Refactored to use product-detail.service.ts for DRY principle
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { RequestWithUser } from '../../../interfaces';
import { validationMiddleware } from '../../../middlewares';
import { ResponseFormatter } from '../../../utils';
import { optionalAuth } from '../../../middlewares/auth.middleware';
import { getProductDetail } from '../services/product-detail.service';

const paramsSchema = z.object({
  slug: z.string().min(1, 'Slug is required'),
});

/**
 * Handler for GET /api/products/slug/:slug
 * Thin controller that delegates to product-detail.service.ts
 */
const handler = async (req: RequestWithUser, res: Response) => {
  const slugParam = req.params.slug;
  const slug = Array.isArray(slugParam) ? slugParam[0] : slugParam;
  const userId = req.userId; // May be undefined for public access

  // Delegate to service layer
  const productDetail = await getProductDetail({ slug, userId });

  return ResponseFormatter.success(res, productDetail, 'Product retrieved successfully');
};

const router = Router();
router.get('/slug/:slug', optionalAuth, validationMiddleware(paramsSchema, 'params'), handler);

export default router;
