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
import { sql } from 'drizzle-orm';
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

  // Inventory - initial stock quantity
  inventory_quantity: z.number().int().nonnegative().optional().default(0),
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
    created_by: createdBy,
    updated_by: createdBy,
  };

  const [newProduct] = await db.insert(products).values(productData).returning();

  if (!newProduct) {
    throw new HttpException(500, 'Failed to create product');
  }

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

  // Create initial inventory record if quantity provided
  if (data.inventory_quantity && data.inventory_quantity > 0) {
    const { inventory } = await import('../../inventory/shared/inventory.schema');
    const { inventoryLocations } = await import('../../inventory/shared/inventory-locations.schema');

    // Get default location or create one if doesn't exist
    const [defaultLocation] = await db.select().from(inventoryLocations).where(sql`name = 'Default Location'`).limit(1);

    if (defaultLocation) {
      await db.insert(inventory).values({
        product_id: newProduct.id,
        location_id: defaultLocation.id,
        product_name: newProduct.product_title,
        sku: newProduct.sku,
        available_quantity: data.inventory_quantity,
        required_quantity: 0,
        reserved_quantity: 0,
        status: 'Enough Stock',
      });
    }
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
