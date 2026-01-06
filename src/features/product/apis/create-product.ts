/**
 * POST /api/products
 * Create a new product (Admin only)
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth } from '../../../middlewares';
import { requirePermission } from '../../../middlewares';
import { validationMiddleware } from '../../../middlewares';
import { ResponseFormatter, decimalSchema } from '../../../utils';
import { HttpException } from '../../../utils';
import { db } from '../../../database';
import { products } from '../shared/product.schema';
import { findProductBySku, findProductBySlug } from '../shared/queries';
import { productCacheService } from '../services/product-cache.service';
import { sanitizeProduct } from '../shared/sanitizeProduct';
import { IProduct } from '../shared/interface';

// Validation schema for creating a product
const createProductSchema = z.object({
  slug: z.string().min(1, 'Slug is required'),
  product_title: z.string().min(1, 'Product title is required'),
  secondary_title: z.string().optional(),

  short_description: z.string().optional(),
  full_description: z.string().optional(),

  status: z.enum(['draft', 'active', 'archived', 'schedule']).default('draft'),
  scheduled_publish_at: z.string().datetime().optional().nullable(),
  is_delisted: z.boolean().default(false),
  delist_date: z.string().datetime().optional().nullable(),
  sales_channels: z.array(z.string()).default([]),

  cost_price: decimalSchema.default('0.00'),
  selling_price: decimalSchema,
  compare_at_price: decimalSchema.optional().nullable(),

  sku: z.string().min(1, 'SKU is required'),
  barcode: z.string().optional().nullable(),
  hsn_code: z.string().optional().nullable(),

  weight: decimalSchema.optional().nullable(),
  length: decimalSchema.optional().nullable(),
  breadth: decimalSchema.optional().nullable(),
  height: decimalSchema.optional().nullable(),
  pickup_location: z.string().optional().nullable(),

  category_tier_1: z.string().optional().nullable(),
  category_tier_2: z.string().optional().nullable(),
  category_tier_3: z.string().optional().nullable(),
  category_tier_4: z.string().optional().nullable(),

  size_group: z.string().optional().nullable(),
  accessories_group: z.string().optional().nullable(),

  primary_image_url: z.string().url().optional().nullable(),
  additional_images: z.array(z.string().url()).default([]),

  meta_title: z.string().optional().nullable(),
  meta_description: z.string().optional().nullable(),

  is_limited_edition: z.boolean().default(false),
  is_preorder_enabled: z.boolean().default(false),
  preorder_release_date: z.string().datetime().optional().nullable(),
  is_gift_wrap_available: z.boolean().default(false),
});

type CreateProductData = z.infer<typeof createProductSchema>;

async function createNewProduct(data: CreateProductData, createdBy: string): Promise<IProduct> {
  // Check SKU uniqueness
  const existingProductWithSku = await findProductBySku(data.sku);
  if (existingProductWithSku) {
    throw new HttpException(409, 'Product with this SKU already exists');
  }

  // Check slug uniqueness
  const existingProductWithSlug = await findProductBySlug(data.slug);
  if (existingProductWithSlug) {
    throw new HttpException(409, 'Product with this slug already exists');
  }

  // Convert datetime strings to Date objects
  const productData: typeof products.$inferInsert = {
    ...data,
    scheduled_publish_at: data.scheduled_publish_at ? new Date(data.scheduled_publish_at) : null,
    delist_date: data.delist_date ? new Date(data.delist_date) : null,
    preorder_release_date: data.preorder_release_date ? new Date(data.preorder_release_date) : null,
    created_by: createdBy,
    updated_by: createdBy,
  };

  const [newProduct] = await db.insert(products).values(productData).returning();

  if (!newProduct) {
    throw new HttpException(500, 'Failed to create product');
  }

  // Cache the new product
  await productCacheService.cacheProduct(newProduct);

  return newProduct as IProduct;
}

const handler = async (req: RequestWithUser, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    throw new HttpException(401, 'User authentication required');
  }

  const productData: CreateProductData = req.body;
  const product = await createNewProduct(productData, userId);
  const productResponse = sanitizeProduct(product);

  ResponseFormatter.success(res, productResponse, 'Product created successfully', 201);
};

const router = Router();
router.post(
  '/',
  requireAuth,
  requirePermission('products:create'),
  validationMiddleware(createProductSchema),
  handler
);

export default router;
