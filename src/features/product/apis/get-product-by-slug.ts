/**
 * GET /api/products/slug/:slug
 * Get product detail by slug with enhanced frontend-compatible response
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq, and, sql, or, inArray } from 'drizzle-orm';
import { RequestWithUser } from '../../../interfaces';
import { validationMiddleware } from '../../../middlewares';
import { ResponseFormatter, HttpException } from '../../../utils';
import { db } from '../../../database';
import { products, productVariants } from '../shared/product.schema';
import { IProductDetailResponse } from '../shared/interface';
import { reviews } from '../../reviews/shared/reviews.schema';
import { inventory } from '../../inventory/shared/inventory.schema';
import { productFaqs } from '../shared/product-faqs.schema';
import { rbacCacheService } from '../../rbac';
import { optionalAuth } from '../../../middlewares/auth.middleware';

const paramsSchema = z.object({
    slug: z.string().min(1),
});

async function getProductDetailBySlug(slug: string, userId?: string): Promise<IProductDetailResponse> {
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

            // Variants flag
            has_variants: products.has_variants,

            // Phase 2A: Total stock from inventory table (unified for products AND variants)
            // Variants now have inventory records with variant_id
            total_stock_count: sql<number>`(
                SELECT COALESCE(SUM(${inventory.available_quantity}), 0) 
                FROM ${inventory} 
                WHERE ${inventory.product_id} = ${products.id} 
                OR ${inventory.variant_id} IN (
                    SELECT id FROM ${productVariants} WHERE product_id = ${products.id}
                )
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
        .where(and(eq(products.slug, slug), eq(products.is_deleted, false)))
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

    // Fetch variants for this product
    const variantsData = await db
        .select({
            id: productVariants.id,
            product_id: productVariants.product_id,
            option_name: productVariants.option_name,
            option_value: productVariants.option_value,
            sku: productVariants.sku,
            barcode: productVariants.barcode,
            cost_price: productVariants.cost_price,
            selling_price: productVariants.selling_price,
            compare_at_price: productVariants.compare_at_price,
            image_url: productVariants.image_url,
            thumbnail_url: productVariants.thumbnail_url,
            is_default: productVariants.is_default,
            is_active: productVariants.is_active,
            created_at: productVariants.created_at,
            updated_at: productVariants.updated_at,
            created_by: productVariants.created_by,
            updated_by: productVariants.updated_by,
            is_deleted: productVariants.is_deleted,
            deleted_at: productVariants.deleted_at,
            deleted_by: productVariants.deleted_by,
        })
        .from(productVariants)
        .where(eq(productVariants.product_id, productData.id));

    const variantIds = variantsData.map(v => v.id);

    // Fetch all inventory for this product and its variants (Unified fetch)
    const inventoryData = await db
        .select({
            product_id: inventory.product_id,
            variant_id: inventory.variant_id,
            available_quantity: inventory.available_quantity,
            reserved_quantity: inventory.reserved_quantity
        })
        .from(inventory)
        .where(
            or(
                eq(inventory.product_id, productData.id),
                variantIds.length > 0 ? inArray(inventory.variant_id, variantIds) : sql`1=0`
            )
        );

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
        images.push(...(productData.additional_images as string[]));
    }

    // Mapping for variant inventory
    const variantInventoryMap = new Map<string, number>();
    inventoryData.forEach(item => {
        if (item.variant_id) {
            const qty = Math.max(0, (Number(item.available_quantity) || 0) - (Number(item.reserved_quantity) || 0));
            variantInventoryMap.set(item.variant_id, (variantInventoryMap.get(item.variant_id) || 0) + qty);
        }
    });

    // Base inventory (tied to product_id)
    const baseInventory = inventoryData
        .filter(item => item.product_id === productData.id)
        .reduce((sum, item) => sum + Math.max(0, (Number(item.available_quantity) || 0) - (Number(item.reserved_quantity) || 0)), 0);

    // Total calculated stock
    const totalCalculatedStock = inventoryData.reduce((sum, item) => {
        return sum + Math.max(0, (Number(item.available_quantity) || 0) - (Number(item.reserved_quantity) || 0));
    }, 0);

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
        inStock: totalCalculatedStock > 0,
        total_stock: totalCalculatedStock,
        base_inventory: baseInventory,

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

        // Variants
        has_variants: productData.has_variants,
        variants: variantsData.map(v => ({
            ...v,
            inventory_quantity: variantInventoryMap.get(v.id) || 0
        })),
    };

    return response;
}

const handler = async (req: RequestWithUser, res: Response) => {
    const slugParam = req.params.slug;
    const slug = Array.isArray(slugParam) ? slugParam[0] : slugParam;
    const userId = req.userId; // May be undefined for public access

    const productDetail = await getProductDetailBySlug(slug, userId);

    return ResponseFormatter.success(res, productDetail, 'Product retrieved successfully');
};

const router = Router();
router.get('/slug/:slug', optionalAuth, validationMiddleware(paramsSchema, 'params'), handler);

export default router;
