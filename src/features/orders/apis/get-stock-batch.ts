/**
 * GET /api/admin/orders/stock/batch
 * Batch fetch current stock levels for multiple products and/or variants
 * Used for real-time stock validation in order forms
 * 
 * Supports:
 * - product_ids: Comma-separated list of product UUIDs (queries base product inventory)
 * - variant_ids: Comma-separated list of variant UUIDs (queries variant-specific inventory)
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { and, isNull, inArray } from 'drizzle-orm';
import { ResponseFormatter } from '../../../utils';
import { db } from '../../../database';
import { inventory } from '../../inventory/shared/inventory.schema';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth, requirePermission } from '../../../middlewares';

const querySchema = z.object({
    product_ids: z.string().optional().transform(val => val ? val.split(',').filter(Boolean) : []),
    variant_ids: z.string().optional().transform(val => val ? val.split(',').filter(Boolean) : []),
});

interface StockResult {
    product_id: string;
    variant_id?: string | null;
    available_quantity: number;
    reserved_quantity: number;
    effective_stock: number; // available - reserved
}

const handler = async (req: RequestWithUser, res: Response) => {
    const { product_ids, variant_ids } = querySchema.parse(req.query);

    if (product_ids.length === 0 && variant_ids.length === 0) {
        return ResponseFormatter.success(res, { stock: [] }, 'No products requested');
    }

    const results: StockResult[] = [];

    // 1. Fetch stock for base products (where variant_id IS NULL)
    if (product_ids.length > 0) {
        const baseProductStock = await db
            .select({
                product_id: inventory.product_id,
                variant_id: inventory.variant_id,
                available_quantity: inventory.available_quantity,
                reserved_quantity: inventory.reserved_quantity,
            })
            .from(inventory)
            .where(and(
                inArray(inventory.product_id, product_ids),
                isNull(inventory.variant_id)
            ));

        for (const row of baseProductStock) {
            if (row.product_id) {
                results.push({
                    product_id: row.product_id,
                    variant_id: null,
                    available_quantity: row.available_quantity,
                    reserved_quantity: row.reserved_quantity,
                    effective_stock: Math.max(0, row.available_quantity - row.reserved_quantity),
                });
            }
        }
    }

    // 2. Fetch stock for specific variants (where variant_id matches)
    if (variant_ids.length > 0) {
        const variantStock = await db
            .select({
                product_id: inventory.product_id,
                variant_id: inventory.variant_id,
                available_quantity: inventory.available_quantity,
                reserved_quantity: inventory.reserved_quantity,
            })
            .from(inventory)
            .where(inArray(inventory.variant_id, variant_ids));

        for (const row of variantStock) {
            if (row.variant_id) {
                results.push({
                    product_id: row.product_id || '',
                    variant_id: row.variant_id,
                    available_quantity: row.available_quantity,
                    reserved_quantity: row.reserved_quantity,
                    effective_stock: Math.max(0, row.available_quantity - row.reserved_quantity),
                });
            }
        }
    }

    return ResponseFormatter.success(res, { stock: results }, 'Stock levels retrieved');
};

const router = Router();
router.get('/admin/orders/stock/batch', requireAuth, requirePermission('orders:read'), handler);

export default router;
