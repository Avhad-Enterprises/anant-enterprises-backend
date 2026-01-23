import { eq, and } from 'drizzle-orm';
import { db } from '../../../database';
import { products, type Product, type NewProduct } from './product.schema';

// Define columns to select (excluding search_vector which is a generated column)
const selectColumns = {
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
  barcode: products.barcode,
  weight: products.weight,
  length: products.length,
  breadth: products.breadth,
  height: products.height,
  category_tier_1: products.category_tier_1,
  category_tier_2: products.category_tier_2,
  category_tier_3: products.category_tier_3,
  category_tier_4: products.category_tier_4,
  tags: products.tags,
  primary_image_url: products.primary_image_url,
  additional_images: products.additional_images,
  meta_title: products.meta_title,
  meta_description: products.meta_description,
  product_url: products.product_url,
  created_at: products.created_at,
  updated_at: products.updated_at,
  created_by: products.created_by,
  updated_by: products.updated_by,
  is_deleted: products.is_deleted,
  deleted_at: products.deleted_at,
  deleted_by: products.deleted_by,
  has_variants: products.has_variants,
};

/**
 * Find product by ID (excluding deleted products)
 * Note: This will be cached via product-cache.service.ts
 */
export const findProductById = async (id: string): Promise<Product | undefined> => {
  const [product] = await db
    .select(selectColumns)
    .from(products)
    .where(and(eq(products.id, id), eq(products.is_deleted, false)))
    .limit(1);

  return product as Product;
};

/**
 * Find product by SKU (excluding deleted products)
 * Note: This will be cached via product-cache.service.ts
 */
export const findProductBySku = async (sku: string): Promise<Product | undefined> => {
  const [product] = await db
    .select(selectColumns)
    .from(products)
    .where(and(eq(products.sku, sku), eq(products.is_deleted, false)))
    .limit(1);

  return product as Product;
};

/**
 * Find product by slug (excluding deleted products)
 * Note: This will be cached via product-cache.service.ts
 */
export const findProductBySlug = async (slug: string): Promise<Product | undefined> => {
  const [product] = await db
    .select(selectColumns)
    .from(products)
    .where(and(eq(products.slug, slug), eq(products.is_deleted, false)))
    .limit(1);

  return product as Product;
};

/**
 * Create a new product
 * Shared query used across services
 */
export const createProduct = async (productData: NewProduct): Promise<Product> => {
  const [newProduct] = await db.insert(products).values(productData).returning(selectColumns);

  return newProduct as Product;
};

/**
 * Update product by ID
 * Shared query used across services
 */
export const updateProductById = async (
  id: string,
  data: Partial<Omit<Product, 'id'>>
): Promise<Product | undefined> => {
  const [updatedProduct] = await db
    .update(products)
    .set({ ...data, updated_at: new Date() })
    .where(eq(products.id, id))
    .returning(selectColumns);

  return updatedProduct as Product;
};

// ============================================
// VARIANT QUERIES
// ============================================

import { asc, ne } from 'drizzle-orm';
import { productVariants, type ProductVariant } from './product.schema';

/**
 * Find all variants for a product (excluding deleted)
 */
export const findVariantsByProductId = async (
  productId: string
): Promise<ProductVariant[]> => {
  const variants = await db
    .select()
    .from(productVariants)
    .where(
      and(
        eq(productVariants.product_id, productId),
        eq(productVariants.is_deleted, false)
      )
    )
    .orderBy(asc(productVariants.created_at));

  return variants;
};

/**
 * Find variant by SKU
 */
export const findVariantBySku = async (
  sku: string
): Promise<ProductVariant | undefined> => {
  const [variant] = await db
    .select()
    .from(productVariants)
    .where(eq(productVariants.sku, sku))
    .limit(1);

  return variant;
};

/**
 * Check if SKU exists in products OR variants table (global uniqueness)
 * Returns true if SKU is already taken
 * @param sku - The SKU to check
 * @param excludeProductId - Optional product ID to exclude (for update scenarios)
 */
export const isSkuTaken = async (
  sku: string,
  excludeProductId?: string
): Promise<boolean> => {
  // Check products table
  const productConditions = excludeProductId
    ? and(eq(products.sku, sku), ne(products.id, excludeProductId))
    : eq(products.sku, sku);

  const [productWithSku] = await db
    .select({ id: products.id })
    .from(products)
    .where(productConditions)
    .limit(1);

  if (productWithSku) return true;

  // Check variants table
  const variantConditions = excludeProductId
    ? and(
      eq(productVariants.sku, sku),
      ne(productVariants.product_id, excludeProductId)
    )
    : eq(productVariants.sku, sku);

  const [variantWithSku] = await db
    .select({ id: productVariants.id })
    .from(productVariants)
    .where(variantConditions)
    .limit(1);

  return !!variantWithSku;
};

/**
 * Delete all variants for a product (soft delete)
 */
export const softDeleteVariantsByProductId = async (
  productId: string,
  deletedBy: string
): Promise<void> => {
  await db
    .update(productVariants)
    .set({
      is_deleted: true,
      deleted_at: new Date(),
      deleted_by: deletedBy,
    })
    .where(eq(productVariants.product_id, productId));
};

