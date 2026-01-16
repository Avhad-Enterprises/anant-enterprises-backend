/**
 * GET /api/inventory/products/:productId/locations
 * Get stock levels for a product across all locations
 */

import { Router, Response, Request, NextFunction } from 'express';
import { ResponseFormatter } from '../../../utils';
import { HttpException } from '../../../utils';
import requireAuth from '../../../middlewares/auth.middleware';
import { getProductStockByLocation } from '../services/location-allocation.service';

const handler = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const productId = req.params.productId;

        const stockByLocation = await getProductStockByLocation(productId);

        if (stockByLocation.length === 0) {
            throw new HttpException(404, 'Product not found in any location');
        }

        const totalAvailable = stockByLocation.reduce(
            (sum: number, loc: any) => sum + (loc.available_quantity - loc.reserved_quantity),
            0
        );

        const totalReserved = stockByLocation.reduce(
            (sum: number, loc: any) => sum + loc.reserved_quantity,
            0
        );

        return ResponseFormatter.success(res, {
            product_id: productId,
            total_available: totalAvailable,
            total_reserved: totalReserved,
            locations: stockByLocation,
            location_count: stockByLocation.length,
        });
    } catch (error) {
        next(error);
    }
};

const router = Router();
router.get('/products/:productId/locations', requireAuth, handler);

export default router;
