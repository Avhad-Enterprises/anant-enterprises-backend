/**
 * PUT /api/products/:id
 * Update product (Admin only)
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth } from '../../../middlewares';
import { requirePermission } from '../../../middlewares';
import { validationMiddleware } from '../../../middlewares';
import {
  ResponseFormatter,
  uuidSchema,
  decimalSchema,
  slugSchema,
  shortTextSchema,
} from '../../../utils';
import { sanitizeProduct } from '../shared/sanitizeProduct';
import { HttpException } from '../../../utils';
import { db } from '../../../database';
import { products } from '../shared/product.schema';
import { IProduct } from '../shared/interface';
import { productCacheService } from '../services/product-cache.service';
import { findProductById, findProductBySku, findProductBySlug } from '../shared/queries';

import { inventory } from '../../inventory/shared/inventory.schema';
import { inventoryLocations } from '../../inventory/shared/inventory-locations.schema';

const paramsSchema = z.object({
  id: uuidSchema,
});

const updateProductSchema = z.object({
  slug: slugSchema.optional(),
  product_title: shortTextSchema.optional(),
  secondary_title: z.string().optional().nullable(),

  short_description: z.string().optional().nullable(),
  full_description: z.string().optional().nullable(),

  status: z.enum(['draft', 'active', 'archived', 'schedule']).optional(),
  scheduled_publish_at: z.string().datetime().optional().nullable(),
  scheduled_publish_time: z.string().optional().nullable(),
  is_delisted: z.boolean().optional(),
  delist_date: z.string().datetime().optional().nullable(),
  featured: z.boolean().optional(),

  cost_price: decimalSchema.optional(),
  selling_price: decimalSchema.optional(),
  compare_at_price: decimalSchema.optional().nullable(),

  sku: shortTextSchema.optional(),
  hsn_code: z.string().optional().nullable(),

  // Inventory - coerced to number to handle string inputs
  inventory_quantity: z.coerce.number().int().nonnegative().optional(),

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
  additional_images: z.array(z.string().url()).optional(),

  meta_title: z.string().optional().nullable(),
  meta_description: z.string().optional().nullable(),
  product_url: z.string().optional().nullable(),
  admin_comment: z.string().optional().nullable(),

  is_limited_edition: z.boolean().optional(),
  is_preorder_enabled: z.boolean().optional(),
  preorder_release_date: z.string().datetime().optional().nullable(),
  is_gift_wrap_available: z.boolean().optional(),

  tags: z.array(z.string()).optional(),
});

type UpdateProduct = z.infer<typeof updateProductSchema>;

async function updateProduct(
  id: string,
  data: UpdateProduct,
  updatedBy: string
): Promise<IProduct> {
  const existingProduct = await findProductById(id);

  if (!existingProduct) {
    throw new HttpException(404, 'Product not found');
  }

  // Check SKU uniqueness if changed
  if (data.sku && data.sku !== existingProduct.sku) {
    const existingProductWithSku = await findProductBySku(data.sku);
    if (existingProductWithSku && existingProductWithSku.id !== id) {
      throw new HttpException(409, 'Product with this SKU already exists');
    }
  }

  // Check slug uniqueness if changed
  if (data.slug && data.slug !== existingProduct.slug) {
    const existingProductWithSlug = await findProductBySlug(data.slug);
    if (existingProductWithSlug && existingProductWithSlug.id !== id) {
      throw new HttpException(409, 'Product with this slug already exists');
    }
  }

  // Handle Inventory Update
  if (data.inventory_quantity !== undefined) {
    // Check if inventory record exists
    const existingInventory = await db
      .select()
      .from(inventory)
      .where(eq(inventory.product_id, id))
      .limit(1);

    if (existingInventory.length > 0) {
      // Update existing inventory logic (simple override for now)
      // Note: Ideally we should handle stock adjustments via transactions or dedicated endpoints
      await db
        .update(inventory)
        .set({
          available_quantity: data.inventory_quantity,
          updated_at: new Date()
        })
        .where(eq(inventory.id, existingInventory[0].id));
    } else {
      // Create new inventory record in default location
      const defaultLocation = await db
        .select()
        .from(inventoryLocations)
        .where(eq(inventoryLocations.is_active, true))
        .limit(1);

      if (defaultLocation.length > 0) {
        await db.insert(inventory).values({
          product_id: id,
          location_id: defaultLocation[0].id,
          available_quantity: data.inventory_quantity,
          required_quantity: 0,
          sku: data.sku || existingProduct.sku,
          product_name: data.product_title || existingProduct.product_title,
          status: 'Enough Stock'
        });
      }
    }
  }

  // Convert datetime strings to Date objects - build incrementally
  // Extract inventory_quantity to avoid passing it to products table update
  const { inventory_quantity, ...productFields } = data;

  const updateData: Record<string, unknown> = {
    ...productFields,
    updated_by: updatedBy,
  };

  if (data.scheduled_publish_at !== undefined) {
    updateData.scheduled_publish_at = data.scheduled_publish_at
      ? new Date(data.scheduled_publish_at)
      : null;
  }
  if (data.delist_date !== undefined) {
    updateData.delist_date = data.delist_date ? new Date(data.delist_date) : null;
  }
  if (data.preorder_release_date !== undefined) {
    updateData.preorder_release_date = data.preorder_release_date
      ? new Date(data.preorder_release_date)
      : null;
  }

  const [result] = await db
    .update(products)
    .set({
      ...updateData,
      updated_at: new Date(),
    })
    .where(eq(products.id, id))
    .returning();

  if (!result) {
    throw new HttpException(500, 'Failed to update product');
  }

  return result as IProduct;
}

const handler = async (req: RequestWithUser, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    throw new HttpException(401, 'User authentication required');
  }

  const paramsSchema = z.object({
    id: uuidSchema,
  });

  const { id } = paramsSchema.parse(req.params);
  const updateData: UpdateProduct = req.body;

  const product = await updateProduct(id, updateData, userId);

  // Invalidate cache for updated product
  await productCacheService.invalidateProduct(product.id, product.sku, product.slug);

  const productResponse = sanitizeProduct(product);

  ResponseFormatter.success(res, productResponse, 'Product updated successfully');
};

const router = Router();

router.put(
  '/:id',
  requireAuth,
  requirePermission('products:update'),
  validationMiddleware(updateProductSchema),
  validationMiddleware(paramsSchema, 'params'),
  handler
);

export default router;
