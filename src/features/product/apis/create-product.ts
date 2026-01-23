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
import { ResponseFormatter, decimalSchema } from '../../../utils';
import { HttpException } from '../../../utils';
import { db } from '../../../database';
import { eq } from 'drizzle-orm';
import { products, productVariants } from '../shared/product.schema';
import { findProductBySlug, isSkuTaken } from '../shared/queries';
import { productCacheService } from '../services/product-cache.service';
import { sanitizeProduct } from '../shared/sanitizeProduct';
import { IProduct } from '../shared/interface';
import { syncTags } from '../../tags/services/tag-sync.service';
import { incrementTierUsage } from '../../tiers/services/tier-sync.service';

// Validation schema for creating a product
const createProductSchema = z.object({
  slug: z.string().min(1, 'Slug is required'),
  product_title: z.string().min(1, 'Product title is required'),
  secondary_title: z.string().optional(),

  short_description: z.string().optional(),
  full_description: z.string().optional(),

  status: z.enum(['draft', 'active', 'archived']).default('draft'),
  featured: z.boolean().default(false),

  cost_price: decimalSchema.default('0.00'),
  selling_price: decimalSchema,
  compare_at_price: decimalSchema.optional().nullable(),

  sku: z.string().min(1, 'SKU is required'),
  hsn_code: z.string().optional().nullable(),

  weight: decimalSchema.optional().nullable(),
  length: decimalSchema.optional().nullable(),
  breadth: decimalSchema.optional().nullable(),
  height: decimalSchema.optional().nullable(),

  category_tier_1: z.string().optional().nullable(),
  category_tier_2: z.string().optional().nullable(),
  category_tier_3: z.string().optional().nullable(),
  category_tier_4: z.string().optional().nullable(),

  primary_image_url: z.string().url().optional().nullable(),
  additional_images: z.array(z.string().url()).default([]),

  meta_title: z.string().optional().nullable(),
  meta_description: z.string().optional().nullable(),
  product_url: z.string().optional().nullable(),

  tags: z.array(z.string()).optional().default([]),

  // FAQs - array of question/answer pairs
  faqs: z.array(z.object({
    question: z.string().min(1, 'Question is required'),
    answer: z.string().min(1, 'Answer is required'),
  })).optional().default([]),

  // Inventory - initial stock quantity (only used for products without variants)
  inventory_quantity: z.number().int().nonnegative().optional().default(0),

  // Variants support
  has_variants: z.boolean().default(false),
  variants: z.array(z.object({
    option_name: z.string().default('Default'),
    option_value: z.string().default('Standard'),
    sku: z.string().min(1, 'Variant SKU is required'),
    barcode: z.string().optional().nullable(),
    cost_price: decimalSchema.default('0.00'),
    selling_price: decimalSchema,
    compare_at_price: decimalSchema.optional().nullable(),
    inventory_quantity: z.number().int().nonnegative().default(0),
    image_url: z.string().url().optional().nullable(),
    thumbnail_url: z.string().url().optional().nullable(),
  })).optional().default([]),
}).refine((data) => {
  if (data.compare_at_price && data.selling_price) {
    const compareAt = parseFloat(data.compare_at_price);
    const selling = parseFloat(data.selling_price);
    return compareAt >= selling;
  }
  return true;
}, {
  message: "Compare at price must be greater than or equal to selling price",
  path: ["compare_at_price"],
}).refine((data) => {
  // If has_variants is true, must have at least one variant
  if (data.has_variants && (!data.variants || data.variants.length === 0)) {
    return false;
  }
  return true;
}, {
  message: "Products with variants must have at least one variant defined",
  path: ["variants"],
}).refine((data) => {
  // Variant SKUs must be unique within the product
  if (data.variants && data.variants.length > 0) {
    const skus = data.variants.map(v => v.sku);
    const uniqueSkus = new Set(skus);
    return skus.length === uniqueSkus.size;
  }
  return true;
}, {
  message: "Variant SKUs must be unique",
  path: ["variants"],
}).refine((data) => {
  // Validate variant pricing: Compare At >= Selling
  if (data.variants && data.variants.length > 0) {
    for (const variant of data.variants) {
      if (variant.compare_at_price && variant.selling_price) {
        const compareAt = parseFloat(variant.compare_at_price);
        const selling = parseFloat(variant.selling_price);
        // Skip if invalid numbers (Zod handles type validation elsewhere)
        if (isNaN(compareAt) || isNaN(selling)) continue;

        if (compareAt < selling) {
          return false;
        }
      }
    }
  }
  return true;
}, {
  message: "Variant 'Compare at price' must be greater than or equal to 'Selling price'",
  path: ["variants"],
});

type CreateProductData = z.infer<typeof createProductSchema>;

async function createNewProduct(data: CreateProductData, createdBy: string): Promise<IProduct> {
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

  const [newProduct] = await db.insert(products).values(productData).returning();

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
    await createInventoryForProduct(
      newProduct.id,
      newProduct.product_title,
      newProduct.sku,
      data.inventory_quantity || 0,
      createdBy
    );

    // Step 2: ALSO create inventory for each variant (if variants exist)
    if (data.has_variants && data.variants && data.variants.length > 0) {
      for (const variant of data.variants) {
        await createInventoryForProduct(
          newProduct.id,
          `${newProduct.product_title} - ${variant.option_value}`,
          variant.sku,
          variant.inventory_quantity || 0,
          createdBy
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
      console.log('[create-product] About to sync tier usage...');
      console.log('[create-product] Tier IDs:', {
        tier1: data.category_tier_1,
        tier2: data.category_tier_2,
        tier3: data.category_tier_3,
        tier4: data.category_tier_4,
      });

      await incrementTierUsage([
        data.category_tier_1 ?? null,
        data.category_tier_2 ?? null,
        data.category_tier_3 ?? null,
        data.category_tier_4 ?? null,
      ]);

      console.log('[create-product] Tier usage synced successfully');
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
