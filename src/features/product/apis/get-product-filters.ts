/**
 * GET /api/products/filters
 * Get available filter options with product counts
 * - Public access
 * - Returns categories, technologies, ratings, and price range
 */

import { Router, Response, Request } from 'express';
import { eq, and, sql } from 'drizzle-orm';
import { ResponseFormatter } from '../../../utils';
import { db } from '../../../database';
import { products } from '../shared/product.schema';
import { reviews } from '../../reviews/shared/reviews.schema';

interface FilterOption {
  id: string;
  label: string;
  count: number;
}

interface RatingOption {
  value: string;
  count: number;
}

interface TechnologyRow {
  id: string;
  label: string;
  count: string;
}

interface RatingRow {
  value: string;
  count: string;
}

interface PriceRange {
  min: number;
  max: number;
}

interface FilterOptions {
  categories: FilterOption[];
  technologies: FilterOption[];
  ratings: RatingOption[];
  priceRange: PriceRange;
}

const handler = async (req: Request, res: Response) => {
  // Get active, non-deleted products only
  const activeProductsCondition = and(
    eq(products.status, 'active'),
    eq(products.is_deleted, false)
  );

  // 1. Get categories with counts
  const categoriesData = await db
    .select({
      category: products.category_tier_1,
      count: sql<number>`COUNT(*)`,
    })
    .from(products)
    .where(activeProductsCondition)
    .groupBy(products.category_tier_1)
    .orderBy(sql`COUNT(*) DESC`);

  const categories: FilterOption[] = categoriesData
    .filter(c => c.category)
    .map(c => ({
      id: c.category!.toLowerCase().replace(/\s+/g, '-'),
      label: c.category!,
      count: Number(c.count),
    }));

  // 2. Get technologies from tags field (JSONB array)
  const technologiesData = await db.execute(sql`
        SELECT 
            LOWER(tag) AS id,
            tag AS label,
            COUNT(DISTINCT p.id) AS count
        FROM ${products} p,
             jsonb_array_elements_text(COALESCE(p.tags, '[]'::jsonb)) AS tag
        WHERE p.status = 'active' 
          AND p.is_deleted = false
        GROUP BY tag
        ORDER BY count DESC
    `);

  const technologies: FilterOption[] = (technologiesData.rows as unknown as TechnologyRow[]).map(
    row => ({
      id: row.id,
      label: row.label,
      count: Number(row.count),
    })
  );

  // 3. Get rating distribution
  const ratingsData = await db.execute(sql`
        SELECT 
            FLOOR(avg_rating)::text AS value,
            COUNT(*) AS count
        FROM (
            SELECT 
                p.id,
                COALESCE(AVG(r.rating), 0) AS avg_rating
            FROM ${products} p
            LEFT JOIN ${reviews} r ON r.product_id = p.id 
                AND r.status = 'approved'
                AND r.is_deleted = false
            WHERE p.status = 'active' AND p.is_deleted = false
            GROUP BY p.id
        ) sub
        WHERE avg_rating >= 2
        GROUP BY FLOOR(avg_rating)
        ORDER BY value DESC
    `);

  const ratings: RatingOption[] = (ratingsData.rows as unknown as RatingRow[]).map(row => ({
    value: row.value,
    count: Number(row.count),
  }));

  // 4. Get price range
  const [priceRangeData] = await db
    .select({
      min: sql<number>`MIN(${products.selling_price}::numeric)`,
      max: sql<number>`MAX(${products.selling_price}::numeric)`,
    })
    .from(products)
    .where(activeProductsCondition);

  const priceRange: PriceRange = {
    min: Math.floor(Number(priceRangeData?.min) || 0),
    max: Math.ceil(Number(priceRangeData?.max) || 200000),
  };

  const filterOptions: FilterOptions = {
    categories,
    technologies,
    ratings,
    priceRange,
  };

  return ResponseFormatter.success(res, filterOptions, 'Filter options retrieved successfully');
};

const router = Router();
router.get('/filters', handler);

export default router;
