import { eq, and } from 'drizzle-orm';
import { db } from '../../../database';
import { products, type Product, type NewProduct } from './product.schema';

/**
 * Find product by ID (excluding deleted products)
 * Note: This will be cached via product-cache.service.ts
 */
export const findProductById = async (id: string): Promise<Product | undefined> => {
    const [product] = await db
        .select()
        .from(products)
        .where(and(eq(products.id, id), eq(products.is_deleted, false)))
        .limit(1);

    return product;
};

/**
 * Find product by SKU (excluding deleted products)
 * Note: This will be cached via product-cache.service.ts
 */
export const findProductBySku = async (sku: string): Promise<Product | undefined> => {
    const [product] = await db
        .select()
        .from(products)
        .where(and(eq(products.sku, sku), eq(products.is_deleted, false)))
        .limit(1);

    return product;
};

/**
 * Find product by slug (excluding deleted products)
 * Note: This will be cached via product-cache.service.ts
 */
export const findProductBySlug = async (slug: string): Promise<Product | undefined> => {
    const [product] = await db
        .select()
        .from(products)
        .where(and(eq(products.slug, slug), eq(products.is_deleted, false)))
        .limit(1);

    return product;
};

/**
 * Create a new product
 * Shared query used across services
 */
export const createProduct = async (productData: NewProduct): Promise<Product> => {
    const [newProduct] = await db.insert(products).values(productData).returning();

    return newProduct;
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
        .returning();

    return updatedProduct;
};
