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
