/**
 * GET /api/inventory/transfers
 * List inventory transfers with optional filters
 */

import { Router, Response, Request, NextFunction } from 'express';
import { ResponseFormatter } from '../../../utils';
import requireAuth from '../../../middlewares/auth.middleware';
import { listTransfers } from '../services/inventory-transfer.service';

const handler = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { status, from_location_id, to_location_id, product_id, limit } = req.query;

        const transfers = await listTransfers({
            status: status as string | undefined,
            from_location_id: from_location_id as string | undefined,
            to_location_id: to_location_id as string | undefined,
            product_id: product_id as string | undefined,
            limit: limit ? parseInt(limit as string, 10) : undefined,
        });

        return ResponseFormatter.success(res, {
            transfers,
            count: transfers.length,
        });
        return;
    } catch (error) {
        next(error);
        return;
    }
};

const router = Router();
router.get('/transfers', requireAuth, handler);

export default router;
