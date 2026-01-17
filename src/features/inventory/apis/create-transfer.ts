/**
 * POST /api/inventory/transfers
 * Create a new inventory transfer between locations
 */

import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ResponseFormatter } from '../../../utils';
import requireAuth from '../../../middlewares/auth.middleware';
import { createTransfer } from '../services/inventory-transfer.service';
import { RequestWithUser } from '../../../interfaces';

const createTransferSchema = z.object({
    product_id: z.string().uuid(),
    from_location_id: z.string().uuid(),
    to_location_id: z.string().uuid(),
    quantity: z.number().int().min(1),
    reason: z.enum(['rebalancing', 'customer_order', 'return', 'manual', 'damaged', 'quality_hold']).optional(),
    notes: z.string().optional(),
});

const handler = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
        const data = createTransferSchema.parse(req.body);
        const userId = req.userId!;

        const transferId = await createTransfer(
            data.product_id,
            data.from_location_id,
            data.to_location_id,
            data.quantity,
            data.reason || 'manual',
            userId,
            data.notes
        );

        return ResponseFormatter.success(
            res,
            { transfer_id: transferId },
            'Transfer created successfully',
            201
        );
        return;
    } catch (error) {
        next(error);
        return;
    }
};

const router = Router();
router.post('/transfers', requireAuth, handler);

export default router;
