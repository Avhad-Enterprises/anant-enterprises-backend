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
import { ResponseFormatter, uuidSchema } from '../../../utils';
import { sanitizeProduct } from '../shared/sanitizeProduct';
import { HttpException } from '../../../utils';
import { db } from '../../../database';
import { products } from '../shared/products.schema';
import { IProduct } from '../shared/interface';
import { updateProductSchema } from '../shared/validation';
import { productCacheService } from '../services/product-cache.service';
import { findProductById, findProductBySku, findProductBySlug } from '../shared/queries';
import { updateTagUsage } from '../../tags/services/tag-sync.service';
import { updateTierUsage } from '../../tiers/services/tier-sync.service';
import { updateProductVariants } from '../services/product-variant-update.service';

import { inventory } from '../../inventory/shared/inventory.schema';
import { inventoryLocations } from '../../inventory/shared/inventory-locations.schema';

const paramsSchema = z.object({
  id: uuidSchema,
});

async function updateProduct(
  id: string,
  data: z.infer<typeof updateProductSchema>,
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
        // Create with location (product_name and sku queried via JOIN)
        await db.insert(inventory).values({
          product_id: id,
          location_id: defaultLocation[0].id,
          available_quantity: data.inventory_quantity,
          reserved_quantity: 0,
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

  await updateProductVariants({
    productId: id,
    hasVariants: data.has_variants,
    variants: data.variants,
    updatedBy,
  });

  // Extract inventory_quantity, faqs, and variants to avoid passing to products table update
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { inventory_quantity, faqs, variants, ...productFields } = data;

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
  const updateData = req.body;

  const product = await updateProduct(id, updateData, userId);

  // Invalidate cache for updated product
  await productCacheService.invalidateProduct(product.id, product.sku, product.slug);

  const productResponse = sanitizeProduct(product);

  // INJECT INVENTORY DATA
  // Use the updated inventory from the request if it was provided, otherwise 0 (or ideally null/undefined if not updated)
  // However, for UI consistency, if we updated it, we must return it.
  const responseWithInventory = {
    ...productResponse,
    base_inventory: updateData.inventory_quantity ?? 0,
    total_stock: updateData.inventory_quantity ?? 0,
  };

  ResponseFormatter.success(res, responseWithInventory, 'Product updated successfully');
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
