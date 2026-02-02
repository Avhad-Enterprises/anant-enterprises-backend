/**
 * GET /api/collections/:slug/products
 * Get products within a specific collection
 * - Public access
 * - Returns collection info + products
 * - Respects manual ordering (position)
 * - Pagination support
 */

import { Router, Response, Request } from 'express';
import { z } from 'zod';
import { eq, and, count } from 'drizzle-orm';
import { ResponseFormatter, HttpException, shortTextSchema } from '../../../utils';
import { db } from '../../../database';
import { collections } from '../shared/collection.schema';
import { collectionProducts } from '../shared/collection-products.schema';
import { products } from '../../product/shared/products.schema';
import { reviews } from '../../reviews/shared/reviews.schema';
import {
  buildAverageRating,
  buildReviewCount,
  buildInventoryQuantity,
} from '../../product/shared/query-builders';

const paramsSchema = z.object({
  slug: shortTextSchema,
});

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

interface CollectionProductItem {
  id: string;
  name: string;
  price: number;
  originalPrice: number | null;
  image: string | null;
  rating: number;
  reviews: number;
  inStock: boolean;
  total_stock: number;
  isNew: boolean;
  category: string;
  technologies: string[];
  description: string | null;
  tags: string[] | null;
}

const handler = async (req: Request, res: Response) => {
  const { slug } = paramsSchema.parse(req.params);
  const { page, limit } = querySchema.parse(req.query);

  // Get collection
  const [collection] = await db
    .select({
      id: collections.id,
      title: collections.title,
      slug: collections.slug,
      description: collections.description,
    })
    .from(collections)
    .where(and(eq(collections.slug, slug), eq(collections.status, 'active')))
    .limit(1);

  if (!collection) {
    throw new HttpException(404, 'Collection not found');
  }

  // Get total product count
  const [countResult] = await db
    .select({ total: count() })
    .from(collectionProducts)
    .innerJoin(products, eq(products.id, collectionProducts.product_id))
    .where(
      and(
        eq(collectionProducts.collection_id, collection.id),
        eq(products.status, 'active'),
        eq(products.is_deleted, false)
      )
    );

  const total = countResult?.total ?? 0;
  const totalPages = Math.ceil(total / limit);
  const offset = (page - 1) * limit;

  // Get products with ratings
  const productsData = await db
    .select({
      id: products.id,
      product_title: products.product_title,
      selling_price: products.selling_price,
      compare_at_price: products.compare_at_price,
      primary_image_url: products.primary_image_url,
      position: collectionProducts.position,
      short_description: products.short_description,
      category_tier_1: products.category_tier_1,
      tags: products.tags,
      created_at: products.created_at,

      // Computed: Average rating
      rating: buildAverageRating(),

      // Computed: Review count
      review_count: buildReviewCount(),

      // Computed: Inventory Quantity (matches product service approach)
      inventory_quantity: buildInventoryQuantity().mapWith(Number),
    })
    .from(collectionProducts)
    .innerJoin(products, eq(products.id, collectionProducts.product_id))
    .leftJoin(
      reviews,
      and(
        eq(reviews.product_id, products.id),
        eq(reviews.status, 'approved'),
        eq(reviews.is_deleted, false)
      )
    )
    .where(
      and(
        eq(collectionProducts.collection_id, collection.id),
        eq(products.status, 'active'),
        eq(products.is_deleted, false)
      )
    )
    .groupBy(
      products.id,
      products.product_title,
      products.selling_price,
      products.compare_at_price,
      products.primary_image_url,
      collectionProducts.position,
      products.short_description,
      products.category_tier_1,
      products.tags,
      products.created_at
    )
    .orderBy(collectionProducts.position)
    .limit(limit)
    .offset(offset);

  // Format products (matches ICollectionProduct interface)
  const formattedProducts: CollectionProductItem[] = productsData.map(product => {
    const createdDate = new Date(product.created_at);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const inventoryQty = Number(product.inventory_quantity || 0);

    return {
      id: product.id,
      name: product.product_title,
      price: Number(product.selling_price),
      originalPrice: product.compare_at_price ? Number(product.compare_at_price) : null,
      image: product.primary_image_url,
      rating: Number(product.rating) || 0,
      reviews: Number(product.review_count) || 0,
      total_stock: inventoryQty,
      inStock: inventoryQty > 0,
      isNew: createdDate > thirtyDaysAgo,
      category: product.category_tier_1?.toLowerCase().replace(/\s+/g, '-') || '',
      technologies: ((product.tags as string[]) || []).map((tag: string) => tag.toLowerCase()),
      description: product.short_description,
      tags: (product.tags as string[]) || null,
    };
  });

  return ResponseFormatter.success(
    res,
    {
      collection: {
        id: collection.id,
        title: collection.title,
        slug: collection.slug,
        description: collection.description,
      },
      products: formattedProducts,
      total,
      totalPages,
      currentPage: page,
    },
    'Collection products retrieved successfully'
  );
};

const router = Router();
router.get('/:slug/products', handler);

export default router;
