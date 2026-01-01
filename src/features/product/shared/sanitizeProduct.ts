import { IProduct } from './interface';

/**
 * Sanitized product type without internal/audit fields
 */
export type SanitizedProduct = Omit<
    IProduct,
    'is_deleted' | 'deleted_at' | 'deleted_by' | 'created_by' | 'updated_by'
>;

/**
 * Remove internal/audit fields from a single product object
 * Ensures sensitive audit data never leaks in API responses
 */
export const sanitizeProduct = (product: IProduct): SanitizedProduct => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { is_deleted, deleted_at, deleted_by, created_by, updated_by, ...sanitized } = product;
    return sanitized;
};

/**
 * Remove internal/audit fields from an array of product objects
 */
export const sanitizeProducts = (products: IProduct[]): SanitizedProduct[] => {
    return products.map(sanitizeProduct);
};
