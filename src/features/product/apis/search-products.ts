/**
 * GET /api/products/search
 * Search products by query
 * - Public access
 * - Searches in title, subtitle, category, SKU
 * - Returns active products only
 */

import { Router, Response, Request } from 'express';
import { z } from 'zod';
import { eq, and, or, sql, ilike } from 'drizzle-orm';
import { ResponseFormatter, searchSchema } from '../../../utils';
import { db } from '../../../database';
import { products } from '../shared/product.schema';
import { reviews } from '../../reviews/shared/reviews.schema';
import { inventory } from '../../inventory/shared/inventory.schema';
import { getSearchTerms, buildProductSearchConditions, calculateRelevanceScore } from '../shared/search-utils';

const querySchema = searchSchema.extend({
  category: z.string().optional(),
  limit: z.preprocess(val => (val ? Number(val) : 20), z.number().int().min(1).max(50)),
});

const handler = async (req: Request, res: Response) => {
  const { q, category, limit } = querySchema.parse(req.query);

  if (!q || !q.trim()) {
    return ResponseFormatter.success(res, [], 'Empty query');
  }

  // Split query into terms for "fuzzy-like" matching
  const terms = getSearchTerms(q);
  const { exactMatch, allTermsMatch, anyTermMatch, searchPattern } = buildProductSearchConditions(q, terms);

  // Base visibility conditions
  const baseConditions = and(
    eq(products.status, 'active'),
    eq(products.is_deleted, false)
  );

  // Category filter
  const categoryCondition = category
    ? or(
      ilike(products.category_tier_1, `%${category}%`),
      ilike(products.category_tier_2, `%${category}%`)
    )
    : undefined;

  // Combine all search logic
  const whereClause = and(
    baseConditions,
    categoryCondition,
    or(exactMatch, allTermsMatch, anyTermMatch)
  );

  // Search products with computed fields
  const searchResults = await db
    .select({
      id: products.id,
      product_title: products.product_title,
      secondary_title: products.secondary_title,
      selling_price: products.selling_price,
      compare_at_price: products.compare_at_price,
      primary_image_url: products.primary_image_url,
      category_tier_1: products.category_tier_1,
      sku: products.sku,

      // Computed fields
      rating: sql<number>`(
        SELECT COALESCE(AVG(${reviews.rating}), 0)
        FROM ${reviews}
        WHERE ${reviews.product_id} = ${products.id}
          AND ${reviews.status} = 'approved'
          AND ${reviews.is_deleted} = false
      )`,
      review_count: sql<number>`(
        SELECT COUNT(${reviews.id})
        FROM ${reviews}
        WHERE ${reviews.product_id} = ${products.id}
          AND ${reviews.status} = 'approved'
          AND ${reviews.is_deleted} = false
      )`,
      total_stock: sql<number>`(
        SELECT COALESCE(SUM(${inventory.available_quantity}), 0)
        FROM ${inventory}
        WHERE ${inventory.product_id} = ${products.id}
      )`,

      // Relevance Score Calculation
      relevance: calculateRelevanceScore(searchPattern, terms).as('relevance')
    })
    .from(products)
    .where(whereClause)
    .orderBy(sql`relevance DESC`, products.product_title)
    .limit(limit);

  // Format results
  const formattedResults = searchResults.map(product => ({
    id: product.id,
    product_title: product.product_title,
    secondary_title: product.secondary_title,
    selling_price: product.selling_price,
    compare_at_price: product.compare_at_price,
    primary_image_url: product.primary_image_url,
    category_tier_1: product.category_tier_1,
    sku: product.sku,
    rating: Number(product.rating) || 0,
    review_count: Number(product.review_count) || 0,
    inStock: (product.total_stock || 0) > 0,
    relevance: Number(product.relevance)
  }));

  return ResponseFormatter.success(
    res,
    formattedResults,
    `Found ${formattedResults.length} products`
  );
};

const router = Router();
router.get('/search', handler);

export default router;
