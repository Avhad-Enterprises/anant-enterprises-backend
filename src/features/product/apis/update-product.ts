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
import validationMiddleware from '../../../middlewares/validation.middleware';
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
import { updateTagUsage } from '../../tags/services/tag-sync.service';
import { updateTierUsage } from '../../tiers/services/tier-sync.service';

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

  status: z.enum(['draft', 'active', 'archived']).optional(),
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

  category_tier_1: z.string().optional().nullable(),
  category_tier_2: z.string().optional().nullable(),
  category_tier_3: z.string().optional().nullable(),
  category_tier_4: z.string().optional().nullable(),

  primary_image_url: z.string().url().optional().nullable(),
  thumbnail_url: z.string().url().optional().nullable(),
  additional_images: z.array(z.string().url()).optional(),
  additional_thumbnails: z.array(z.union([z.string().url(), z.literal('')])).optional(),

  meta_title: z.string().optional().nullable(),
  meta_description: z.string().optional().nullable(),
  product_url: z.string().optional().nullable(),

  tags: z.array(z.string()).optional(),

  // FAQs - array of question/answer pairs
  faqs: z.array(z.object({
    question: z.string().min(1, 'Question is required'),
    answer: z.string().min(1, 'Answer is required'),
  })).optional(),
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
      // Create new inventory record
      const defaultLocation = await db
        .select()
        .from(inventoryLocations)
        .where(eq(inventoryLocations.is_active, true))
        .limit(1);

      if (defaultLocation.length > 0) {
        // Create with location
        await db.insert(inventory).values({
          product_id: id,
          location_id: defaultLocation[0].id,
          available_quantity: data.inventory_quantity,
          reserved_quantity: 0,
          sku: data.sku || existingProduct.sku,
          product_name: data.product_title || existingProduct.product_title,
          status: 'in_stock'
        });
      } else {
        throw new HttpException(400, 'Cannot create inventory: No active inventory location found. Please create an inventory location first.');
      }
    }
  }

  // Handle FAQ update - replace all FAQs
  if (data.faqs !== undefined) {
    const { productFaqs } = await import('../shared/product-faqs.schema');

    // Delete existing FAQs
    await db.delete(productFaqs).where(eq(productFaqs.product_id, id));

    // Insert new FAQs if provided
    if (data.faqs && data.faqs.length > 0) {
      const faqsData = data.faqs.map(faq => ({
        product_id: id,
        question: faq.question,
        answer: faq.answer,
      }));
      await db.insert(productFaqs).values(faqsData);
    }
  }

  // Convert datetime strings to Date objects - build incrementally
  // Extract inventory_quantity and faqs to avoid passing them to products table update
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { inventory_quantity, faqs, ...productFields } = data;

  // Transform empty strings to null for category tiers (DB expects UUID or null)
  const cleanedFields = { ...productFields };
  if (cleanedFields.category_tier_1 === '') cleanedFields.category_tier_1 = null;
  if (cleanedFields.category_tier_2 === '') cleanedFields.category_tier_2 = null;
  if (cleanedFields.category_tier_3 === '') cleanedFields.category_tier_3 = null;
  if (cleanedFields.category_tier_4 === '') cleanedFields.category_tier_4 = null;

  const updateData: Record<string, unknown> = {
    ...cleanedFields,
    updated_by: updatedBy,
  };

  let result;
  try {
    [result] = await db
      .update(products)
      .set({
        ...updateData,
        updated_at: new Date(),
      })
      .where(eq(products.id, id))
      .returning();
  } catch (error: any) {
    console.error('❌ [updateProduct] Database update failed:', {
      error: error.message,
      code: error.code,
      detail: error.detail,
      constraint: error.constraint,
      updateData: updateData,
    });
    throw new HttpException(500, `Failed to update product: ${error.message}`);
  }

  if (!result) {
    throw new HttpException(500, 'Failed to update product');
  }

  // Update tag usage counts (handle additions/removals)
  if (data.tags !== undefined) {
    const oldTags = (existingProduct.tags as string[]) || [];
    const newTags = data.tags || [];
    await updateTagUsage(oldTags, newTags, 'product');
  }

  // Update tier usage counts (handle category changes)
  const oldTiers = [
    existingProduct.category_tier_1,
    existingProduct.category_tier_2,
    existingProduct.category_tier_3,
    existingProduct.category_tier_4,
  ];
  const newTiers = [
    cleanedFields.category_tier_1 ?? existingProduct.category_tier_1,
    cleanedFields.category_tier_2 ?? existingProduct.category_tier_2,
    cleanedFields.category_tier_3 ?? existingProduct.category_tier_3,
    cleanedFields.category_tier_4 ?? existingProduct.category_tier_4,
  ];
  await updateTierUsage(oldTiers, newTiers);

  return result as IProduct;
}

const handler = async (req: RequestWithUser, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    throw new HttpException(401, 'User authentication required');
  }

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
