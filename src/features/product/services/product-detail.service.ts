import { db } from '../../../database/drizzle';
import { and, eq, or, inArray, sql } from 'drizzle-orm';
import { products } from '../shared/products.schema';
import { productVariants } from '../shared/product-variants.schema';
import { reviews } from '../../reviews/shared/reviews.schema';
import { inventory } from '../../inventory/shared/inventory.schema';
import { productFaqs } from '../shared/product-faqs.schema';
import { HttpException } from '../../../utils/helpers/httpException';
import { rbacCacheService } from '../../rbac/services/rbac-cache.service';
import { IProductResponse } from '../shared/responses';
import { findVariantsByProductId } from '../shared/queries';

/**
 * Options for fetching product details
 */
interface GetProductDetailOptions {
  /** Product ID (mutually exclusive with slug) */
  id?: string;
  /** Product slug (mutually exclusive with id) */
  slug?: string;
  /** Optional user ID for permission checks */
  userId?: string;
}

/**
 * Product Detail Service
 * 
 * Consolidates the shared logic between get-product-by-id and get-product-by-slug APIs.
 * This service handles:
 * - Product query with computed fields (rating, review count, stock)
 * - Permission checks for non-active products
 * - FAQ fetching
 * - Variant and inventory fetching
 * - Response transformation and calculation (discount, images, stock)
 * 
 * @param options - Either id or slug must be provided
 * @returns IProductResponse with all product details
 * @throws HttpException if product not found or permission denied
 */
export async function getProductDetail(options: GetProductDetailOptions): Promise<IProductResponse> {
  const { id, slug, userId } = options;

  // Validate input - exactly one of id or slug must be provided
  if ((!id && !slug) || (id && slug)) {
    throw new HttpException(400, 'Either id or slug must be provided, but not both');
  }

  // Build base query with all product fields and computed aggregations
  const [productData] = await db
    .select({
      // Core product fields
      id: products.id,
      slug: products.slug,
      product_title: products.product_title,
      secondary_title: products.secondary_title,
      short_description: products.short_description,
      full_description: products.full_description,
      admin_comment: products.admin_comment,
      status: products.status,
      featured: products.featured,

      // Pricing
      cost_price: products.cost_price,
      selling_price: products.selling_price,
      compare_at_price: products.compare_at_price,

      // Inventory
      sku: products.sku,
      hsn_code: products.hsn_code,
      barcode: products.barcode,

      // Media
      primary_image_url: products.primary_image_url,
      additional_images: products.additional_images,

      // Categories
      category_tier_1: products.category_tier_1,
      category_tier_2: products.category_tier_2,
      category_tier_3: products.category_tier_3,
      category_tier_4: products.category_tier_4,

      // Timestamps
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
    .where(
      and(
        id ? eq(products.id, id) : eq(products.slug, slug!),
        eq(products.is_deleted, false)
      )
    )
    .limit(1);

  if (!productData) {
    throw new HttpException(404, 'Product not found');
  }

  // Check if product is viewable (permission check for non-active products)
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

  // Fetch variants if product has variants
  const variantsData = productData.has_variants
    ? await findVariantsByProductId(productData.id)
    : [];

  const variantIds = variantsData.map(v => v.id);

  // Fetch all inventory for this product and its variants (Unified fetch)
  const inventoryData = await db
    .select({
      product_id: inventory.product_id,
      variant_id: inventory.variant_id,
      available_quantity: inventory.available_quantity,
      reserved_quantity: inventory.reserved_quantity,
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

  // Calculate total physical stock from unified inventory table (available + reserved)
  const totalPhysicalStock = inventoryData.reduce((sum, item) => {
    const available = Number(item.available_quantity) || 0;
    const reserved = Number(item.reserved_quantity) || 0;
    return sum + available + reserved;
  }, 0);

  // Calculate available stock (for sale)
  const totalAvailableStock = inventoryData.reduce((sum, item) => {
    const available = Number(item.available_quantity) || 0;
    return sum + available;
  }, 0);

  // Calculate total reserved stock
  const totalReservedStock = inventoryData.reduce((sum, item) => {
    const reserved = Number(item.reserved_quantity) || 0;
    return sum + reserved;
  }, 0);

  // Calculate base inventory for product (first inventory record if exists)
  const baseInventoryItem = inventoryData.find(item => item.product_id === productData.id);
  const baseCalculatedInventory = baseInventoryItem
    ? Number(baseInventoryItem.available_quantity) || 0
    : 0;

  // Mapping for variant inventory (available stock only)
  const variantInventoryMap = new Map<string, number>();
  inventoryData.forEach(item => {
    if (item.variant_id) {
      const qty = Number(item.available_quantity) || 0;
      variantInventoryMap.set(item.variant_id, (variantInventoryMap.get(item.variant_id) || 0) + qty);
    }
  });

  // Transform variants with inventory
  const variants = variantsData.map(variant => {
    const variantStock = variantInventoryMap.get(variant.id) || 0;

    return {
      id: variant.id,
      product_id: variant.product_id,
      option_name: variant.option_name,
      option_value: variant.option_value,
      sku: variant.sku || '',
      barcode: variant.barcode || null,
      cost_price: variant.cost_price,
      selling_price: variant.selling_price,
      compare_at_price: variant.compare_at_price,
      image_url: variant.image_url || null,
      thumbnail_url: variant.thumbnail_url || null,
      is_default: variant.is_default,
      is_active: variant.is_active,
      inventory_quantity: variantStock, // Phase 2A: populated from inventory table
      created_at: variant.created_at,
      updated_at: variant.updated_at,
      created_by: variant.created_by || null,
      updated_by: variant.updated_by || null,
      is_deleted: variant.is_deleted,
      deleted_at: variant.deleted_at || null,
      deleted_by: variant.deleted_by || null,
    };
  });

  // Build and return the complete response
  const response: IProductResponse = {
    // Core fields
    id: productData.id,
    slug: productData.slug,
    product_title: productData.product_title,
    secondary_title: productData.secondary_title,
    short_description: productData.short_description,
    full_description: productData.full_description,
    admin_comment: productData.admin_comment || null,
    status: productData.status,

    // Pricing
    cost_price: productData.cost_price,
    selling_price: productData.selling_price,
    compare_at_price: productData.compare_at_price,
    discount,

    // Inventory
    sku: productData.sku,
    inStock: totalAvailableStock > 0,
    total_stock: totalPhysicalStock, // Total physical stock (available + reserved)
    available_stock: totalAvailableStock, // Stock available for sale
    reserved_stock: totalReservedStock, // Stock reserved for orders
    base_inventory: baseCalculatedInventory,

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
    barcode: productData.barcode,

    tags: (productData.tags as string[]) || [],

    featured: productData.featured,

    // Variants flag
    has_variants: productData.has_variants,

    // Related data
    faqs: faqsData.map(faq => ({
      id: faq.id,
      question: faq.question,
      answer: faq.answer,
    })),

    variants,
  };

  return response;
}
