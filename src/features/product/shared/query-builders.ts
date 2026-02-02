import { sql } from 'drizzle-orm';
import { products } from './products.schema';
import { productVariants } from './product-variants.schema';
import { inventory } from '../../inventory/shared/inventory.schema';
import { reviews } from '../../reviews/shared/reviews.schema';

export function buildInventoryQuantity(): ReturnType<typeof sql<number>> {
  return sql<number>`(
    SELECT COALESCE(SUM(${inventory.available_quantity}), 0)
    FROM ${inventory}
    WHERE ${inventory.product_id} = ${products.id}
  )`;
}

export function buildInventoryQuantityWithVariants(): ReturnType<typeof sql<number>> {
  return sql<number>`
    COALESCE(
      (SELECT SUM(${inventory.available_quantity} - ${inventory.reserved_quantity})
       FROM ${inventory}
       WHERE ${inventory.product_id} = ${products.id}
       OR ${inventory.variant_id} IN (
         SELECT id FROM ${productVariants}
         WHERE ${productVariants.product_id} = ${products.id}
         AND ${productVariants.is_active} = true
         AND ${productVariants.is_deleted} = false
       )),
      0
    )
  `;
}

export function buildAverageRating(): ReturnType<typeof sql<number>> {
  return sql<number>`COALESCE(AVG(${reviews.rating}), 0)`;
}

export function buildReviewCount(): ReturnType<typeof sql<number>> {
  return sql<number>`COUNT(${reviews.id})`;
}
