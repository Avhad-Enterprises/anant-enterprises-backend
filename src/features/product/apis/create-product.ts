/**
 * POST /api/products
 * Create a new product (Admin only)
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth } from '../../../middlewares';
import { requirePermission } from '../../../middlewares';
import validationMiddleware from '../../../middlewares/validation.middleware';
import { ResponseFormatter } from '../../../utils';
import { HttpException } from '../../../utils';
import { db } from '../../../database';
import { eq } from 'drizzle-orm';
import { products } from '../shared/products.schema';
import { productVariants } from '../shared/product-variants.schema';
import { findProductBySlug, isSkuTaken } from '../shared/queries';
import { productCacheService } from '../services/product-cache.service';
import { sanitizeProduct } from '../shared/sanitizeProduct';
import { IProduct } from '../shared/interface';
import { createProductSchema } from '../shared/validation';
import { syncTags } from '../../tags/services/tag-sync.service';
import { incrementTierUsage } from '../../tiers/services/tier-sync.service';

async function createNewProduct(data: z.infer<typeof createProductSchema>, createdBy: string): Promise<IProduct> {
  // Check product SKU uniqueness (globally across products and variants)
  const productSkuTaken = await isSkuTaken(data.sku);
  if (productSkuTaken) {
    throw new HttpException(409, 'Product with this SKU already exists');
  }

  // Check variant SKUs uniqueness (globally)
  if (data.has_variants && data.variants && data.variants.length > 0) {
    for (const variant of data.variants) {
      const variantSkuTaken = await isSkuTaken(variant.sku);
      if (variantSkuTaken) {
        throw new HttpException(409, `SKU '${variant.sku}' is already in use`);
      }
    }
  }

  // Check slug uniqueness
  const existingProductWithSlug = await findProductBySlug(data.slug);
  if (existingProductWithSlug) {
    throw new HttpException(409, 'Product with this slug already exists');
  }

  // Prepare product data
  const productData: typeof products.$inferInsert = {
    slug: data.slug,
    product_title: data.product_title,
    secondary_title: data.secondary_title,
    short_description: data.short_description,
    full_description: data.full_description,
    status: data.status,
    featured: data.featured,
    cost_price: data.cost_price,
    selling_price: data.selling_price,
    compare_at_price: data.compare_at_price,
    sku: data.sku,
    hsn_code: data.hsn_code,
    weight: data.weight,
    length: data.length,
    breadth: data.breadth,
    height: data.height,
    category_tier_1: data.category_tier_1,
    category_tier_2: data.category_tier_2,
    category_tier_3: data.category_tier_3,
    category_tier_4: data.category_tier_4,
    primary_image_url: data.primary_image_url,
    additional_images: data.additional_images,
    meta_title: data.meta_title,
    meta_description: data.meta_description,
    product_url: data.product_url,
    tags: data.tags,
    has_variants: data.has_variants || false,
    created_by: createdBy,
    updated_by: createdBy,
  };

  let newProduct;
  try {
    [newProduct] = await db.insert(products).values(productData).returning();
  } catch (err: any) {
    console.error('❌ Error inserting product:', {
      message: err.message,
      code: err.code,
      detail: err.detail,
      constraint: err.constraint,
      params: productData
    });
    throw new HttpException(500, `Database error: ${err.message}`);
  }

  if (!newProduct) {
    throw new HttpException(500, 'Failed to create product');
  }

  try {
    // Store FAQs if provided
    if (data.faqs && data.faqs.length > 0) {
      const { productFaqs } = await import('../shared/product-faqs.schema');
      const faqsData = data.faqs.map(faq => ({
        product_id: newProduct.id,
        question: faq.question,
        answer: faq.answer,
      }));
      await db.insert(productFaqs).values(faqsData);
    }

    // Create variants if product has variants
    if (data.has_variants && data.variants && data.variants.length > 0) {
      const variantsData = data.variants.map((variant, index) => ({
        product_id: newProduct.id,
        option_name: variant.option_name,
        option_value: variant.option_value,
        sku: variant.sku,
        barcode: variant.barcode,
        cost_price: variant.cost_price,
        selling_price: variant.selling_price,
        compare_at_price: variant.compare_at_price,
        inventory_quantity: variant.inventory_quantity,
        image_url: variant.image_url,
        thumbnail_url: variant.thumbnail_url,
        is_default: index === 0, // First variant is default
        is_active: true,
        created_by: createdBy,
        updated_by: createdBy,
      }));

      await db.insert(productVariants).values(variantsData);
    }

    // ========================================
    // INVENTORY CREATION (Best Practice)
    // ========================================
    // ALWAYS create base product inventory first
    // Then create variant inventories if variants exist
    // This ensures both base product AND variants have their own inventory
    // ========================================

    const { createInventoryForProduct } = await import('../../inventory/services/inventory.service');

    // Step 1: ALWAYS create inventory for the BASE product
    // Product name and SKU are queried via JOIN from products table
    await createInventoryForProduct(
      newProduct.id,
      data.inventory_quantity || 0,
      createdBy
    );

    // Step 2: ALSO create inventory for each variant (if variants exist)
    if (data.has_variants && data.variants && data.variants.length > 0) {
      // We need to fetch the newly created variants to get their IDs
      const insertedVariants = await db
        .select()
        .from(productVariants)
        .where(eq(productVariants.product_id, newProduct.id));

      for (const variant of insertedVariants) {
        // Find matching variant from input data to get its initial quantity
        const inputVariant = data.variants.find(v => v.sku === variant.sku);
        const initialQty = inputVariant?.inventory_quantity || 0;

        await createInventoryForProduct(
          newProduct.id,
          initialQty,
          createdBy,
          undefined,
          variant.id
        );
      }
    }

    // Cache the new product
    await productCacheService.cacheProduct(newProduct);

    // Sync tags to master table
    if (data.tags && data.tags.length > 0) {
      await syncTags(data.tags, 'product');
    }

    // Sync tier usage counts
    try {
      await incrementTierUsage([
        data.category_tier_1 ?? null,
        data.category_tier_2 ?? null,
        data.category_tier_3 ?? null,
        data.category_tier_4 ?? null,
      ]);
    } catch (tierError) {
      console.error('[create-product] ERROR syncing tier usage:', tierError);
      // Don't fail product creation if tier sync fails
      // Just log the error
    }

    return newProduct as IProduct;

  } catch (error) {
    console.error('Error during product creation post-processing. Rolling back product...', error);
    // Compensating transaction: Delete the product if any subsequent step fails
    await db.delete(products).where(eq(products.id, newProduct.id));
    throw error;
  }
}

const handler = async (req: RequestWithUser, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    throw new HttpException(401, 'User authentication required');
  }

  const productData = req.body;
  const product = await createNewProduct(productData, userId);
  const productResponse = sanitizeProduct(product);

  // INJECT INVENTORY DATA
  // The frontend expects 'base_inventory' or 'total_stock' to be present
  // since the 'inventory_quantity' column was removed from the products table.
  const responseWithInventory = {
    ...productResponse,
    base_inventory: productData.inventory_quantity || 0,
    total_stock: productData.inventory_quantity || 0,
    // If variants exist, we should ideally map them too, but for now base_inventory is critical
    variants: product.has_variants && productData.variants 
      ? productData.variants.map((v: any) => ({
          ...v, // Includes inventory_quantity from input
          // We don't have the new IDs here without refactoring, so we return input data
          // The frontend mainly needs the product ID which is at the root
      })) 
      : undefined
  };

  ResponseFormatter.success(res, responseWithInventory, 'Product created successfully', 201);
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
