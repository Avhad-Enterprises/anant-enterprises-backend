/**
 * GET /api/products/:id
 * Get product detail with enhanced frontend-compatible response
 * - Public can view active products
 * - Admins can view all products
 * - Includes computed fields: rating, reviews, inStock, discount
 * - Maps backend schema to frontend without changing field names
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq, and, sql } from 'drizzle-orm';
import { RequestWithUser } from '../../../interfaces';
import validationMiddleware from '../../../middlewares/validation.middleware';
import { ResponseFormatter, HttpException } from '../../../utils';
import { db } from '../../../database';
import { products } from '../shared/product.schema';
import { IProductDetailResponse } from '../shared/interface';
import { reviews } from '../../reviews/shared/reviews.schema';
import { inventory } from '../../inventory/shared/inventory.schema';
import { productFaqs } from '../shared/product-faqs.schema';
import { rbacCacheService } from '../../rbac';

const paramsSchema = z.object({
  id: z.string(),
});

// UUID regex for validation
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function getProductDetailById(idOrSlug: string, userId?: string): Promise<IProductDetailResponse> {
  const isUuid = uuidRegex.test(idOrSlug);

  // Build condition based on input type
  const matchCondition = isUuid
    ? eq(products.id, idOrSlug)
    : eq(products.slug, idOrSlug);

  // Fetch product with computed fields using optimized subqueries
  const [productData] = await db
    .select({
      // All product fields
      id: products.id,
      slug: products.slug,
      product_title: products.product_title,
      secondary_title: products.secondary_title,
      short_description: products.short_description,
      full_description: products.full_description,
      status: products.status,
      featured: products.featured,
      cost_price: products.cost_price,
      selling_price: products.selling_price,
      compare_at_price: products.compare_at_price,
      sku: products.sku,
      hsn_code: products.hsn_code,
      primary_image_url: products.primary_image_url,
      additional_images: products.additional_images,
      category_tier_1: products.category_tier_1,
      category_tier_2: products.category_tier_2,
      category_tier_3: products.category_tier_3,
      category_tier_4: products.category_tier_4,
      created_at: products.created_at,
      updated_at: products.updated_at,

      // Dimensions
      weight: products.weight,
      length: products.length,
      breadth: products.breadth,
      height: products.height,

      // SEO
      meta_title: products.meta_title,
      meta_description: products.meta_description,
      product_url: products.product_url,

      // Tags
      tags: products.tags,

      // Computed: Total stock from inventory
      total_stock: sql<string>`(
        SELECT CAST(COALESCE(SUM(${inventory.available_quantity}), 0) AS TEXT)
        FROM ${inventory}
        WHERE ${inventory.product_id} = ${products.id}
      )`,

      // Computed: Average rating from reviews
      avg_rating: sql<number>`(
        SELECT COALESCE(AVG(${reviews.rating}), 0)
        FROM ${reviews}
        WHERE ${reviews.product_id} = ${products.id}
          AND ${reviews.status} = 'approved'
          AND ${reviews.is_deleted} = false
      )`,

      // Computed: Review count
      review_count: sql<number>`(
        SELECT COUNT(${reviews.id})
        FROM ${reviews}
        WHERE ${reviews.product_id} = ${products.id}
          AND ${reviews.status} = 'approved'
          AND ${reviews.is_deleted} = false
      )`,
    })
    .from(products)
    .where(and(matchCondition, eq(products.is_deleted, false)))
    .limit(1);

  if (!productData) {
    throw new HttpException(404, 'Product not found');
  }

  // Check if product is viewable
  if (productData.status !== 'active') {
    if (!userId) {
      throw new HttpException(401, 'Authentication required to view this product');
    }

    const hasPermission = await rbacCacheService.hasPermission(userId, 'products:read');
    if (!hasPermission) {
      throw new HttpException(403, 'You do not have permission to view draft/archived products');
    }
  }

  // Fetch FAQs for this product
  const faqsData = await db
    .select({
      id: productFaqs.id,
      question: productFaqs.question,
      answer: productFaqs.answer,
    })
    .from(productFaqs)
    .where(eq(productFaqs.product_id, productData.id));

  // Calculate discount percentage
  let discount: number | null = null;
  if (productData.compare_at_price && productData.selling_price) {
    const comparePrice = Number(productData.compare_at_price);
    const sellPrice = Number(productData.selling_price);
    if (comparePrice > sellPrice) {
      discount = Math.round(((comparePrice - sellPrice) / comparePrice) * 100);
    }
  }

  // Combine images (primary + additional)
  const images: string[] = [];
  if (productData.primary_image_url) {
    images.push(productData.primary_image_url);
  }
  if (productData.additional_images && Array.isArray(productData.additional_images)) {
    images.push(...productData.additional_images);
  }

  // Build response
  const response: IProductDetailResponse = {
    // Core fields
    id: productData.id,
    slug: productData.slug,
    product_title: productData.product_title,
    secondary_title: productData.secondary_title,
    short_description: productData.short_description,
    full_description: productData.full_description,
    status: productData.status,

    // Pricing
    cost_price: productData.cost_price,
    selling_price: productData.selling_price,
    compare_at_price: productData.compare_at_price,
    discount,

    // Inventory
    sku: productData.sku,
    inStock: Number(productData.total_stock || 0) > 0,
    total_stock: Number(productData.total_stock) || 0,

    // Media
    primary_image_url: productData.primary_image_url,
    additional_images: (productData.additional_images as string[]) || [],
    images,

    // Categories
    category_tier_1: productData.category_tier_1,
    category_tier_2: productData.category_tier_2,
    category_tier_3: productData.category_tier_3,
    category_tier_4: productData.category_tier_4,

    // Reviews
    rating: Number(productData.avg_rating) || 0,
    review_count: Number(productData.review_count) || 0,

    // Timestamps
    created_at: productData.created_at,
    updated_at: productData.updated_at,

    // Extended Fields
    weight: productData.weight,
    length: productData.length,
    breadth: productData.breadth,
    height: productData.height,

    meta_title: productData.meta_title,
    meta_description: productData.meta_description,
    product_url: productData.product_url,

    hsn_code: productData.hsn_code,

    tags: (productData.tags as string[]) || [],

    // Featured
    featured: productData.featured,

    // FAQs
    faqs: faqsData.map(faq => ({
      id: faq.id,
      question: faq.question,
      answer: faq.answer,
    })),
  };

  return response;
}

const handler = async (req: RequestWithUser, res: Response) => {
  const idParam = req.params.id;
  const id = Array.isArray(idParam) ? idParam[0] : idParam;
  const userId = req.userId; // May be undefined for public access

  const productDetail = await getProductDetailById(id, userId);

  return ResponseFormatter.success(res, productDetail, 'Product retrieved successfully');
};

const router = Router();
router.get('/:id', validationMiddleware(paramsSchema, 'params'), handler);

export default router;
