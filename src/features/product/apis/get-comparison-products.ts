/**
 * GET /api/products/compare
 * Get products for comparison
 * - Public access
 * - Supports comparison by IDs or category
 * - Returns products with specs
 */

import { Router, Response, Request } from 'express';
import { z } from 'zod';
import { eq, and, inArray, sql, SQL } from 'drizzle-orm';
import { ResponseFormatter } from '../../../utils';
import { db } from '../../../database';
import { products } from '../shared/product.schema';
import { reviews } from '../../reviews/shared/reviews.schema';
import {
  commaSeparatedUuidsSchema,
  shortTextSchema,
} from '../../../utils/validation/common-schemas';

const querySchema = z.object({
  ids: commaSeparatedUuidsSchema(5).optional(), // Comma-separated product IDs, max 5
  category: shortTextSchema.optional(),
  limit: z.coerce.number().int().min(1).max(5).default(5),
});

interface ComparisonProduct {
  id: string;
  product_title: string;
  primary_image_url: string | null;
  selling_price: string;
  category_tier_1: string | null;
  short_description: string | null;
  rating: number;
  specs: Record<string, unknown> | null;
  bestValue?: boolean;
  highlight?: string;
}

const handler = async (req: Request, res: Response) => {
  const { ids, category, limit } = querySchema.parse(req.query);

  // eslint-disable-next-line prefer-const
  let conditions: SQL[] = [eq(products.status, 'active'), eq(products.is_deleted, false)];

  // Filter by IDs if provided
  if (ids) {
    if (ids.length > 0) {
      conditions.push(inArray(products.id, ids));
    }
  }

  // Filter by category if provided
  if (category && !ids) {
    conditions.push(eq(products.category_tier_1, category));
  }

  // Fetch products for comparison
  const comparisonProducts = await db
    .select({
      id: products.id,
      product_title: products.product_title,
      primary_image_url: products.primary_image_url,
      selling_price: products.selling_price,
      category_tier_1: products.category_tier_1,
      short_description: products.short_description,
      specs: products.specs,

      // Computed: Average rating
      rating: sql<number>`(
        SELECT COALESCE(AVG(${reviews.rating}), 0)
        FROM ${reviews}
        WHERE ${reviews.product_id} = ${products.id}
          AND ${reviews.status} = 'approved'
          AND ${reviews.is_deleted} = false
      )`,
    })
    .from(products)
    .where(and(...conditions))
    .orderBy(products.selling_price)
    .limit(limit);

  // Format results
  const formattedResults = comparisonProducts.map((product, index) => {
    const result: ComparisonProduct = {
      id: product.id,
      product_title: product.product_title,
      primary_image_url: product.primary_image_url,
      selling_price: product.selling_price,
      category_tier_1: product.category_tier_1,
      short_description: product.short_description,
      rating: Number(product.rating) || 0,
      specs: product.specs as Record<string, unknown> | null,
    };

    // Add highlights for specific products
    if (index === 0) {
      result.highlight = 'Best Value';
      result.bestValue = true;
    } else if (index === comparisonProducts.length - 1) {
      result.highlight = 'Premium';
    }

    return result;
  });

  return ResponseFormatter.success(
    res,
    formattedResults,
    `Found ${formattedResults.length} products for comparison`
  );
};

const router = Router();
router.get('/compare', handler);

export default router;
