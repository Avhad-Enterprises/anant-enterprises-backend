/**
 * GET /api/products
 * Get all products with pagination and advanced filters
 * - Admin: Full access with status filtering
 * - Public: Active products only with collection filters
 */

import { Router, Response, Request } from 'express';
import { eq, sql, and, gte, lte, or } from 'drizzle-orm';
import { z } from 'zod';
import { ResponseFormatter, paginationSchema } from '../../../utils';
import { db } from '../../../database';
import { products } from '../shared/product.schema';
import { ICollectionProduct } from '../shared/interface';
import { reviews } from '../../reviews/shared/reviews.schema';
import { tiers } from '../../tiers/shared/tiers.schema';
import { inventory } from '../../inventory/shared/inventory.schema';

// Query params validation
const querySchema = paginationSchema
  .extend({
    // Admin filters
    status: z.enum(['draft', 'active', 'archived']).optional(),
    category_tier_1: z.string().optional(),

    // Public collection filters
    categories: z.string().optional(), // Comma-separated slugs
    technologies: z.string().optional(), // Comma-separated tech IDs (uses tags field)
    ratings: z.string().optional(), // Comma-separated min ratings
    minPrice: z.preprocess(val => (val ? Number(val) : 0), z.number().min(0)),
    maxPrice: z.preprocess(val => (val ? Number(val) : 200000), z.number().min(0)),

    // Sorting
    sort: z.enum(['newest', 'price-asc', 'price-desc', 'rating']).default('newest'),
  })
  .refine(data => data.limit <= 50, { message: 'Limit cannot exceed 50 for product queries' });

const handler = async (req: Request, res: Response) => {
  try {
    const params = querySchema.parse(req.query);

    // Check if request has auth token (admin)
    const authHeader = req.headers['authorization'];
    const isAdmin = authHeader && authHeader.startsWith('Bearer ');

    // Build base conditions
    const conditions = [eq(products.is_deleted, false)];

    // Admin vs Public filtering
    if (isAdmin) {
      // Admin can filter by status
      if (params.status) {
        conditions.push(eq(products.status, params.status));
      }
      if (params.category_tier_1) {
        conditions.push(eq(products.category_tier_1, params.category_tier_1));
      }
    } else {
      // Public: only active products
      conditions.push(eq(products.status, 'active'));
    }



    // Category filter (slugified matching via Subquery)
    if (params.categories) {
      const categoryList = params.categories.split(',').map(c => c.trim().toLowerCase());

      // Check if product belongs to any tier that matches the requested slugs
      if (categoryList.length > 0) {
        conditions.push(sql`EXISTS (
          SELECT 1 FROM ${tiers} t
          WHERE (
               t.id = ${products.category_tier_1}
            OR t.id = ${products.category_tier_2}
            OR t.id = ${products.category_tier_3}
            OR t.id = ${products.category_tier_4}
          )
          AND t.code IN ${categoryList}
        )`);
      }
    }

    // Technology filter (uses tags field - JSONB array overlap)
    if (params.technologies) {
      const techList = params.technologies.split(',').map(t => t.trim().toLowerCase());
      // Check if any tag in the array matches (case-insensitive)
      const techConditions = techList.map(
        tech =>
          sql`EXISTS (
                  SELECT 1 FROM jsonb_array_elements_text(COALESCE(${products.tags}, '[]'::jsonb)) AS tag
                  WHERE LOWER(tag) = ${tech}
              )`
      );
      if (techConditions.length > 0) {
        const orCondition = or(...techConditions);
        if (orCondition) {
          conditions.push(orCondition);
        }
      }
    }

    // Price range filter
    conditions.push(gte(products.selling_price, params.minPrice.toString()));
    conditions.push(lte(products.selling_price, params.maxPrice.toString()));

    const whereClause = and(...conditions);

    // Calculate offset
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 20;
    const offset = (page - 1) * limit;

    // Main query with computed fields
    const productsData = await db
      .select({
        id: products.id,
        product_title: products.product_title,
        selling_price: products.selling_price,
        compare_at_price: products.compare_at_price,
        primary_image_url: products.primary_image_url,
        category_tier_1: products.category_tier_1,
        tags: products.tags,
        created_at: products.created_at,
        updated_at: products.updated_at,
        status: products.status,
        featured: products.featured,
        sku: products.sku,

        // Computed: Inventory Quantity (Subquery to avoid Cartesian product details with Reviews)
        inventory_quantity: sql<number>`(
          SELECT COALESCE(SUM(${inventory.available_quantity}), 0)
          FROM ${inventory}
          WHERE ${inventory.product_id} = ${products.id}
        )`.mapWith(Number),

        // Computed: Average rating
        rating: sql<number>`COALESCE(AVG(${reviews.rating}), 0)`,

        // Computed: Review count
        review_count: sql<number>`COUNT(${reviews.id})`,
      })
      .from(products)
      .leftJoin(
        reviews,
        and(
          eq(reviews.product_id, products.id),
          eq(reviews.status, 'approved'),
          eq(reviews.is_deleted, false)
        )
      )
      .groupBy(
        products.id,
        products.product_title,
        products.selling_price,
        products.compare_at_price,
        products.primary_image_url,
        products.category_tier_1,
        products.tags,
        products.created_at,
        products.updated_at,
        products.status,
        products.featured,
        products.sku
      );

    // Apply rating filter using HAVING clause (if specified)
    let filteredProducts = productsData;
    if (params.ratings) {
      const minRatings = params.ratings.split(',').map(r => parseFloat(r.trim()));
      const minRating = Math.min(...minRatings);
      filteredProducts = productsData.filter(p => Number(p.rating) >= minRating);
    }

    // Apply sorting
    filteredProducts.sort((a, b) => {
      switch (params.sort) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'price-asc':
          return Number(a.selling_price) - Number(b.selling_price);
        case 'price-desc': // fixed case from 'price-desc' to 'price-desc' (consistency)
          return Number(b.selling_price) - Number(a.selling_price);
        case 'rating':
          return Number(b.rating) - Number(a.rating);
        default:
          return 0;
      }
    });

    // Apply pagination
    const paginatedProducts = filteredProducts.slice(offset, offset + params.limit);
    const totalPages = Math.ceil(filteredProducts.length / params.limit);

    // Admin Response: Return raw data matching the Admin Frontend types
    if (isAdmin) {
      // Format inventory_quantity as string to match frontend expectation
      const adminProducts = paginatedProducts.map(p => ({
        ...p,
        inventory_quantity: p.inventory_quantity.toString()
      }));

      return ResponseFormatter.success(
        res,
        {
          products: adminProducts,
          total: filteredProducts.length,
          totalPages,
          currentPage: params.page,
        },
        'Products retrieved successfully'
      );
    }

    // Public/Storefront Response: Format response with field mapping
    const formattedProducts: ICollectionProduct[] = paginatedProducts.map(product => {
      const createdDate = new Date(product.created_at);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      return {
        id: product.id,
        name: product.product_title,
        tags: (product.tags as string[]) || [],
        rating: Number(product.rating) || 0,
        reviews: Number(product.review_count) || 0,
        price: Number(product.selling_price),
        originalPrice: product.compare_at_price ? Number(product.compare_at_price) : null,
        image: product.primary_image_url,
        isNew: createdDate > thirtyDaysAgo,
        category: product.category_tier_1?.toLowerCase().replace(/\s+/g, '-') || '',
        technologies: ((product.tags as string[]) || []).map((tag: string) => tag.toLowerCase()),
      };
    });

    console.log('DEBUG: Response Data', {
      filteredLength: filteredProducts.length,
      paginatedLength: paginatedProducts.length,
      formattedLength: formattedProducts.length,
      offset,
      limit: params.limit,
      page: params.page
    });

    return ResponseFormatter.success(
      res,
      {
        products: formattedProducts,
        total: filteredProducts.length,
        totalPages,
        currentPage: params.page,
      },
      'Products retrieved successfully'
    );
  } catch (error) {
    console.error('Error in get-all-products:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve products',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

const router = Router();
// Public endpoint - no authentication required
router.get('/', handler);

export default router;
