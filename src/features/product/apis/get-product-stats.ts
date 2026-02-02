/**
 * GET /api/products/stats
 * Get global product statistics (Total, Active, Featured, Out of Stock, Low Stock)
 * - Used for dashboard cards to reflect efficient database-wide state
 */

import { Router, Response, Request } from 'express';
import { sql } from 'drizzle-orm';
import { ResponseFormatter } from '../../../utils';
import { db } from '../../../database';
import { products } from '../shared/products.schema';
import { inventory } from '../../inventory/shared/inventory.schema';

const handler = async (req: Request, res: Response) => {
  try {
    // Aggregation query using CTE for inventory totals to ensure correct counts
    const result = await db.execute(sql`
      WITH inventory_totals AS (
        SELECT 
          product_id, 
          SUM(available_quantity) as total_qty
        FROM ${inventory}
        GROUP BY product_id
      )
      SELECT 
        COUNT(*) FILTER (WHERE p.is_deleted = false) as total,
        COUNT(*) FILTER (WHERE p.is_deleted = false AND p.status = 'active') as active,
        COUNT(*) FILTER (WHERE p.is_deleted = false AND p.featured = true) as featured,
        COUNT(*) FILTER (WHERE p.is_deleted = false AND COALESCE(i.total_qty, 0) = 0) as out_of_stock,
        COUNT(*) FILTER (WHERE p.is_deleted = false AND COALESCE(i.total_qty, 0) > 0 AND COALESCE(i.total_qty, 0) <= 5) as low_stock
      FROM ${products} p
      LEFT JOIN inventory_totals i ON p.id = i.product_id
      WHERE p.is_deleted = false;
    `);

    // Drizzle execute returns a QueryResult object in this setup
    const rows = result.rows; 
    const stats = rows && rows.length > 0 ? rows[0] : { total: 0, active: 0, featured: 0, out_of_stock: 0, low_stock: 0 };

    return ResponseFormatter.success(res, {
      total: Number(stats.total),
      active: Number(stats.active),
      featured: Number(stats.featured),
      out_of_stock: Number(stats.out_of_stock),
      low_stock: Number(stats.low_stock),
    }, 'Product statistics retrieved successfully');

  } catch (error) {
    return ResponseFormatter.error(
      res,
      'FETCH_ERROR',
      'Failed to retrieve product statistics',
      500
    );
  }
};

const router = Router();
router.get('/stats', handler);

export default router;
