/**
 * GET /api/products/:productId/bundles
 * Get bundles containing a specific product
 * - Public access
 * - Returns active bundles only
 * - Includes bundle items and pricing
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq, and, sql, gte, lte, or, isNull } from 'drizzle-orm';
import { RequestWithUser } from '../../../interfaces';
import { validationMiddleware } from '../../../middlewares';
import { ResponseFormatter } from '../../../utils';
import { db } from '../../../database';
import { bundles } from '../../bundles/shared/bundles.schema';
import { bundleItems } from '../../bundles/shared/bundle-items.schema';
import { products } from '../shared/product.schema';
import { uuidSchema } from '../../../utils/validation/common-schemas';

const paramsSchema = z.object({
  productId: uuidSchema,
});

interface BundleItemDetail {
  product_title: string;
  primary_image_url: string | null;
  selling_price: string;
  compare_at_price: string | null;
}

interface IntermediateBundle {
  id: string;
  title: string | null;
  bundle_type: string | null;
  price_value: string | null;
  items: BundleItemDetail[];
}

interface ProductBundle {
  id: string;
  title: string;
  items: BundleItemDetail[];
  bundle_price: string;
  original_price: number;
  discount: number;
}

const handler = async (req: RequestWithUser, res: Response) => {
  const { productId } = req.params;

  const now = new Date();

  // Find bundles containing this product
  const bundlesData = await db
    .select({
      bundle_id: bundles.id,
      bundle_title: bundles.title,
      bundle_type: bundles.type,
      price_value: bundles.price_value,

      // Bundle item details
      item_product_id: bundleItems.product_id,
      item_quantity: bundleItems.quantity,

      // Product details
      product_title: products.product_title,
      product_image: products.primary_image_url,
      product_selling_price: products.selling_price,
      product_compare_price: products.compare_at_price,
    })
    .from(bundleItems)
    .innerJoin(bundles, eq(bundleItems.bundle_id, bundles.id))
    .innerJoin(products, eq(bundleItems.product_id, products.id))
    .where(
      and(
        // Bundle contains our product
        sql`${bundles.id} IN (
          SELECT bundle_id FROM ${bundleItems} WHERE product_id = ${productId}
        )`,
        eq(bundles.status, 'active'),
        eq(bundles.is_deleted, false),
        // Check validity period
        or(isNull(bundles.starts_at), lte(bundles.starts_at, now)),
        or(isNull(bundles.ends_at), gte(bundles.ends_at, now))
      )
    );

  // Group by bundle
  const bundlesMap = new Map<string, IntermediateBundle>();

  bundlesData.forEach(row => {
    if (!bundlesMap.has(row.bundle_id)) {
      bundlesMap.set(row.bundle_id, {
        id: row.bundle_id,
        title: row.bundle_title,
        bundle_type: row.bundle_type,
        price_value: row.price_value,
        items: [],
      });
    }

    const bundle = bundlesMap.get(row.bundle_id);
    if (bundle) {
      bundle.items.push({
        product_title: row.product_title,
        primary_image_url: row.product_image,
        selling_price: row.product_selling_price,
        compare_at_price: row.product_compare_price,
      });
    }
  });

  // Calculate pricing for each bundle
  const formattedBundles: ProductBundle[] = Array.from(bundlesMap.values()).map(bundle => {
    // Calculate original price (sum of all item prices)
    const originalPrice = bundle.items.reduce(
      (sum: number, item: BundleItemDetail) => sum + Number(item.selling_price),
      0
    );

    // Calculate bundle price based on type
    let bundlePrice = originalPrice;
    if (bundle.bundle_type === 'fixed_price') {
      // Fixed price: use the price_value directly
      bundlePrice = Number(bundle.price_value) || originalPrice;
    } else if (bundle.bundle_type === 'percentage_discount') {
      // Percentage discount: apply discount to original price
      const discountPercent = Number(bundle.price_value) || 0;
      bundlePrice = originalPrice * (1 - discountPercent / 100);
    }

    // Calculate discount percentage
    const discount = Math.round(((originalPrice - bundlePrice) / originalPrice) * 100);

    return {
      id: bundle.id,
      title: bundle.title || '',
      items: bundle.items,
      bundle_price: bundlePrice.toFixed(2),
      original_price: originalPrice,
      discount: discount > 0 ? discount : 0,
    };
  });

  return ResponseFormatter.success(
    res,
    formattedBundles,
    `Found ${formattedBundles.length} bundles`
  );
};

const router = Router();
router.get('/:productId/bundles', validationMiddleware(paramsSchema, 'params'), handler);

export default router;
