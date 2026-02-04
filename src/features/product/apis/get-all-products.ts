/**
 * GET /api/products
 * Get all products with pagination and advanced filters
 * - Admin: Full access with status filtering
 * - Public: Active products only with collection filters
 */

import { Router, Response, Request } from 'express';
import { eq, sql, and, gte, lte, or, ilike } from 'drizzle-orm';
import { z } from 'zod';
import { ResponseFormatter, paginationSchema, logger } from '../../../utils';
import { db } from '../../../database';
import { products } from '../shared/products.schema';
import { IProductListItem } from '../shared/responses';
import { reviews } from '../../reviews/shared/reviews.schema';
import { tiers } from '../../tiers/shared/tiers.schema';
import {
  buildAverageRating,
  buildReviewCount,
  buildInventoryQuantityWithVariants,
  buildAvailableStockWithVariants,
} from '../shared/query-builders';

// Query params validation
const querySchema = paginationSchema
  .extend({
    // Admin filters
    status: z.union([z.string(), z.array(z.string())]).optional(),
    category_tier_1: z.union([z.string(), z.array(z.string())]).optional(),

    // Public collection filters
    categories: z.string().optional(), // Comma-separated slugs
    technologies: z.string().optional(), // Comma-separated tech IDs (uses tags field)
    ratings: z.string().optional(), // Comma-separated min ratings
    minPrice: z.preprocess(val => (val ? Number(val) : 0), z.number().min(0)),
    maxPrice: z.preprocess(val => (val ? Number(val) : 200000), z.number().min(0)),

    // Search
    search: z.string().optional(),

    // Sorting
    sortBy: z.enum(['created_at', 'updated_at', 'selling_price', 'cost_price', 'compare_at_price', 'product_title', 'category_tier_1', 'inventory_quantity', 'total_stock', 'status', 'featured', 'sku', 'rating']).default('created_at').optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc').optional(),

    // Additional Filters
    stockStatus: z.union([z.string(), z.array(z.string())]).optional(),
    quickFilter: z.union([z.string(), z.array(z.string())]).optional(),
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
        const statuses = Array.isArray(params.status) ? params.status : [params.status];
        if (statuses.length > 0) {
          // Fix: cast 's' to any to avoid strict enum type mismatch with string array
          const statusConditions = statuses.map(s => eq(products.status, s as any));
          if (statusConditions.length > 0) {
             const combined = or(...statusConditions);
             if (combined) conditions.push(combined);
          }
        }
      }
      if (params.category_tier_1) {
        const cats = Array.isArray(params.category_tier_1) ? params.category_tier_1 : [params.category_tier_1];
        if (cats.length > 0) {
           const catConditions = cats.map(c => eq(products.category_tier_1, c));
           const combined = or(...catConditions);
           if (combined) conditions.push(combined);
        }
      }
    } else {
      // Public: only active products
      conditions.push(eq(products.status, 'active'));
    }

    // Search Logic (Full Text + SKU + Tags)
    // Search Logic (Fuzzy Match + SKU + Tags)
    if (params.search && params.search.trim().length > 0) {
      const searchQuery = params.search.trim();
      const searchPattern = `%${searchQuery}%`;

      // Fuzzy matching for Title (using pg_trgm similarity)
      // Threshold > 0.1 allows for loose matching (e.g. typos), adjustments can be made.
      const titleFuzzyCondition = sql`similarity(${products.product_title}, ${searchQuery}) > 0.1`;
      
      // Standard substring match for identifiers should retain precision
      const skuCondition = ilike(products.sku, searchPattern);
      const barcodeCondition = ilike(products.barcode, searchPattern);
      
      // Tags search
      const tagsCondition = sql`${products.tags}::text ILIKE ${searchPattern}`;
      
      // Keep Full Text Search for exact word matches as it utilizes the search_vector index efficiently
      const fullTextCondition = sql`${products.search_vector} @@ plainto_tsquery('english', ${searchQuery})`;

      // Combine: Fuzzy Title OR SKU OR Barcode OR Tags OR FullText
      const searchConditions = or(
          titleFuzzyCondition, 
          skuCondition, 
          barcodeCondition,
          tagsCondition,
          fullTextCondition
      );

      if (searchConditions) {
        conditions.push(searchConditions);
      }
    }

    // Category filter (Recursive CTE for Hierarchical Matching)
    if (params.categories) {
      const categoryList = params.categories.split(',').map(c => c.trim().toLowerCase());

      if (categoryList.length > 0) {
        // Recursive CTE to get the selected tier(s) and ALL their descendants
        // Then filter products that belong to ANY of those resolved Tier IDs
        conditions.push(sql`EXISTS (
          WITH RECURSIVE tier_tree AS (
            -- Anchor member: Select IDs of the chosen categories by code
            SELECT id FROM ${tiers} WHERE code IN ${categoryList}
            
            UNION ALL
            
            -- Recursive member: Select children of the accumulated tiers
            SELECT t.id FROM ${tiers} t
            INNER JOIN tier_tree tt ON t.parent_id = tt.id
          )
          -- Final check: Does the product belong to any of these tiers?
          SELECT 1 FROM tier_tree
          WHERE 
               tier_tree.id = ${products.category_tier_1}
            OR tier_tree.id = ${products.category_tier_2}
            OR tier_tree.id = ${products.category_tier_3}
            OR tier_tree.id = ${products.category_tier_4}
        )`);
      }
    }

    // Technology filter (uses tags field - JSONB array overlap)
    if (params.technologies) {
      const techList = params.technologies.split(',').map(t => t.trim().toLowerCase());

      const techConditions = techList.map(
        tech =>
          sql`EXISTS (
              SELECT 1 FROM jsonb_array_elements_text(COALESCE(${products.tags}, '[]'::jsonb)) AS tag
              WHERE LOWER(tag) = ${tech}
          )`
      );

      if (techConditions.length > 0) {
        const combinedTech = or(...techConditions);
        if (combinedTech) {
          conditions.push(combinedTech);
        }
      }
    }

    // Price range filter
    conditions.push(gte(products.selling_price, params.minPrice.toString()));
    conditions.push(lte(products.selling_price, params.maxPrice.toString()));

    // Apply Quick Filters (Pre-DB Filtering where possible)
    if (params.quickFilter) {
      const quickFilters = Array.isArray(params.quickFilter) ? params.quickFilter : [params.quickFilter];
      
      if (quickFilters.includes('recently-updated')) {
        // Filter products updated in the last 7 days
        conditions.push(sql`${products.updated_at} >= NOW() - INTERVAL '7 days'`);
      }
    }

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
        cost_price: products.cost_price,
        compare_at_price: products.compare_at_price,
        primary_image_url: products.primary_image_url,
        category_tier_1: products.category_tier_1,
        category_tier_2: products.category_tier_2,
        tags: products.tags,
        created_at: products.created_at,
        updated_at: products.updated_at,
        status: products.status,
        featured: products.featured,
        sku: products.sku,
        barcode: products.barcode,
        hsn_code: products.hsn_code,
        weight: products.weight,
        length: products.length,
        breadth: products.breadth,
        height: products.height,
        slug: products.slug,
        description: products.short_description,

        // Computed: Inventory Quantity (available stock for sale)
        inventory_quantity: buildAvailableStockWithVariants().mapWith(Number),

        // Computed: Average rating
        rating: buildAverageRating(),

        // Computed: Review count
        review_count: buildReviewCount(),

        // Computed: Total Stock (total physical stock = available + reserved)
        total_stock: buildInventoryQuantityWithVariants().mapWith(Number),
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
      .where(whereClause)
      .groupBy(
        products.id,
        products.product_title,
        products.selling_price,
        products.cost_price,
        products.compare_at_price,
        products.primary_image_url,
        products.category_tier_1,
        products.category_tier_2,
        products.tags,
        products.created_at,
        products.updated_at,
        products.status,
        products.featured,
        products.sku,
        products.barcode,
        products.hsn_code,
        products.weight,
        products.length,
        products.breadth,
        products.height,
        products.slug,
        products.short_description
      );

    // Apply rating filter using HAVING clause (if specified)
    let filteredProducts = productsData;
    if (params.ratings) {
      const minRatings = params.ratings.split(',').map(r => parseFloat(r.trim()));
      const minRating = Math.min(...minRatings);
      filteredProducts = productsData.filter(p => Number(p.rating) >= minRating);
    }

    // Apply Stock Status Filter
    if (params.stockStatus) {
      // const stockStatuses = Array.isArray(params.stockStatus) ? params.stockStatus : [params.stockStatus];
      
      filteredProducts = filteredProducts.filter(p => {
        const qty = Number(p.inventory_quantity || 0);
        switch (params.stockStatus) {
          case 'in_stock': return qty > 0;
          case 'out_of_stock': return qty === 0;
          case 'low_stock': return qty > 0 && qty <= 5;
          default: return true;
        }
      });
    }

    // Apply sorting
    filteredProducts.sort((a, b) => {
      const field = params.sortBy || 'created_at';
      const order = params.sortOrder || 'desc';
      const multiplier = order === 'asc' ? 1 : -1;

      switch (field) {
        case 'selling_price':
          return (Number(a.selling_price) - Number(b.selling_price)) * multiplier;
        case 'cost_price':
          return (Number(a.cost_price || 0) - Number(b.cost_price || 0)) * multiplier;
        case 'compare_at_price':
           return (Number(a.compare_at_price || 0) - Number(b.compare_at_price || 0)) * multiplier;
        case 'inventory_quantity':
        case 'total_stock':
          // Convert inventory string to number for comparison
          return (Number(a.inventory_quantity || 0) - Number(b.inventory_quantity || 0)) * multiplier;
        case 'rating':
          return (Number(a.rating || 0) - Number(b.rating || 0)) * multiplier;
        case 'created_at':
          return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * multiplier;
        case 'updated_at':
          return (new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()) * multiplier;
        case 'product_title':
        case 'category_tier_1':
        case 'status':
        case 'featured':
        case 'sku':
          const valA = String(a[field] || '').toLowerCase();
          const valB = String(b[field] || '').toLowerCase();
          if (valA < valB) return -1 * multiplier;
          if (valA > valB) return 1 * multiplier;
          return 0;
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
        inventory_quantity: p.inventory_quantity.toString(),
        total_stock: p.total_stock
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
    const formattedProducts: IProductListItem[] = paginatedProducts.map(product => {
      const createdDate = new Date(product.created_at);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const inventoryQty = Number(product.inventory_quantity || 0);

      return {
        id: product.id,
        slug: product.slug,
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
        description: product.description,
        inStock: inventoryQty > 0,
        total_stock: inventoryQty,
      };
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
  } catch (error: unknown) {
    logger.error('Failed to retrieve products:', error);
    return ResponseFormatter.error(
      res,
      'FETCH_ERROR',
      'Failed to retrieve products',
      500
    );
  }
};

const router = Router();
// Public endpoint - no authentication required
router.get('/', handler);

export default router;
