/**
 * PUT /api/inventory/transfers/:id/execute
 * Execute a pending transfer (moves stock from source to destination)
 */

import { Router, Response, NextFunction } from 'express';
import { ResponseFormatter } from '../../../utils';
import { HttpException } from '../../../utils';
import { requireAuth } from '../../../middlewares';
import { executeTransfer } from '../services/inventory-transfer.service';
import { RequestWithUser } from '../../../interfaces';

const handler = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
        const transferId = req.params.id as string;
        const userId = req.userId!;

        await executeTransfer(transferId, userId);

        return ResponseFormatter.success(res, null, 'Transfer executed successfully');
        return;
    } catch (error: any) {
        next(new HttpException(400, error.message || 'Failed to execute transfer'));
        return;
    }
};

const router = Router();
router.put('/transfers/:id/execute', requireAuth, handler);

export default router;
