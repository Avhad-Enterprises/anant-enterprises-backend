/**
 * GET /api/inventory/:id/history
 * Get adjustment history for an inventory item
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { RequestWithUser } from '../../../interfaces';
import { ResponseFormatter, uuidSchema, HttpException, logger } from '../../../utils';
import { getInventoryById, getInventoryHistory } from '../services/inventory.service';
import { requireAuth, requirePermission } from '../../../middlewares';

const paramsSchema = z.object({
    id: uuidSchema,
});

const querySchema = z.object({
    limit: z.coerce.number().int().min(1).max(100).default(50),
});

const handler = async (req: RequestWithUser, res: Response) => {
    try {
        const { id } = req.params as { id: string };

        // Validate UUID inline (prevents route conflict)
        const paramsValidation = paramsSchema.safeParse({ id });
        if (!paramsValidation.success) {
            throw new HttpException(400, 'Invalid inventory ID format');
        }

        const { limit } = querySchema.parse(req.query);

        logger.info(`GET /api/inventory/${id}/history`);

        const existing = await getInventoryById(id);
        if (!existing) {
            throw new HttpException(404, 'Inventory item not found');
        }

        const history = await getInventoryHistory(id, limit);

        ResponseFormatter.success(res, history, 'Inventory history retrieved successfully');
    } catch (error) {
        logger.error('Error in get-inventory-history:', error);
        throw error;
    }
};

const router = Router();
router.get('/:id/history', requireAuth, requirePermission('inventory:read'), handler);

export default router;
