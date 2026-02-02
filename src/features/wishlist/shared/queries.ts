import { sql } from 'drizzle-orm';
import { inventory } from '../../inventory/shared/inventory.schema';
import { reviews } from '../../reviews/shared/reviews.schema';
import { products } from '../../product/shared/product.schema';

/**
 * Get total available stock for a product (subquery)
 * Calculates: SUM(available - reserved)
 */
export const getProductStockSubquery = (productIdColumn: any = products.id) => {
    return sql<number>`(
    SELECT COALESCE(SUM(${inventory.available_quantity} - ${inventory.reserved_quantity}), 0)
    FROM ${inventory}
    WHERE ${inventory.product_id} = ${productIdColumn}
  )`;
};

/**
 * Get average rating for a product (subquery)
 * Only counts approved, non-deleted reviews
 */
export const getProductRatingSubquery = (productIdColumn: any = products.id) => {
    return sql<number>`(
    SELECT COALESCE(AVG(${reviews.rating}), 0)
    FROM ${reviews}
    WHERE ${reviews.product_id} = ${productIdColumn}
      AND ${reviews.status} = 'approved'
      AND ${reviews.is_deleted} = false
  )`;
};

/**
 * Get review count for a product (subquery)
 * Only counts approved, non-deleted reviews
 */
export const getProductReviewCountSubquery = (productIdColumn: any = products.id) => {
    return sql<number>`(
    SELECT COUNT(${reviews.id})
    FROM ${reviews}
    WHERE ${reviews.product_id} = ${productIdColumn}
      AND ${reviews.status} = 'approved'
      AND ${reviews.is_deleted} = false
  )`;
};
