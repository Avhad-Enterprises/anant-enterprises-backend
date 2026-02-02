/**
 * GET /api/products/:id
 * Get product detail with enhanced frontend-compatible response
 * - Public can view active products
 * - Admins can view all products
 * - Includes computed fields: rating, reviews, inStock, discount
 * - Maps backend schema to frontend without changing field names
 * 
 * Phase B: Refactored to use product-detail.service.ts for DRY principle
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { RequestWithUser } from '../../../interfaces';
import validationMiddleware from '../../../middlewares/validation.middleware';
import { ResponseFormatter } from '../../../utils';
import { optionalAuth } from '../../../middlewares/auth.middleware';
import { getProductDetail } from '../services/product-detail.service';

const paramsSchema = z.object({
  id: z.string().uuid('Invalid product ID format'),
});

/**
 * Handler for GET /api/products/:id
 * Thin controller that delegates to product-detail.service.ts
 */
const handler = async (req: RequestWithUser, res: Response) => {
  const idParam = req.params.id;
  const id = Array.isArray(idParam) ? idParam[0] : idParam;
  const userId = req.userId; // May be undefined for public access

  // Delegate to service layer
  const productDetail = await getProductDetail({ id, userId });

  return ResponseFormatter.success(res, productDetail, 'Product retrieved successfully');
};

const router = Router();
router.get('/:id', optionalAuth, validationMiddleware(paramsSchema, 'params'), handler);

export default router;
