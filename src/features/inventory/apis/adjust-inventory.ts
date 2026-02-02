/**
 * POST /api/inventory/:id/adjust
 * Adjust inventory quantity with reason tracking
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { RequestWithUser } from '../../../interfaces';
import { validationMiddleware, requireAuth, requirePermission } from '../../../middlewares';
import { ResponseFormatter, uuidSchema, HttpException, logger } from '../../../utils';
import { adjustInventory, getInventoryById } from '../services/inventory.service';

const paramsSchema = z.object({
    id: uuidSchema,
});

const bodySchema = z.object({
    quantity_change: z.number().int().refine(val => val !== 0, {
        message: 'Quantity change cannot be zero',
    }),
    reason: z.string().min(1).max(500),
    reference_number: z.string().max(100).optional(),
    notes: z.string().optional(),
});

const handler = async (req: RequestWithUser, res: Response) => {
    try {
        const { id } = req.params as { id: string };
        const data = req.body;
        const userId = req.userId;

        if (!userId) {
            throw new HttpException(401, 'Unauthorized: User ID required for audit logging');
        }

        logger.info(`POST /api/inventory/${id}/adjust`, { data });

        // Check if inventory exists
        const existing = await getInventoryById(id);
        if (!existing) {
            throw new HttpException(404, 'Inventory item not found');
        }

        const result = await adjustInventory(id, data, userId);

        ResponseFormatter.success(
            res,
            {
                inventory: result.inventory,
                adjustment: result.adjustment,
            },
            'Inventory adjusted successfully'
        );
    } catch (error: any) {
        logger.error('Error in adjust-inventory:', error);

        if (error.message === 'Resulting quantity cannot be negative') {
            throw new HttpException(400, error.message);
        }

        throw error;
    }
};

const router = Router();
router.post('/:id/adjust', requireAuth, requirePermission('inventory:update'), validationMiddleware(paramsSchema, 'params'), validationMiddleware(bodySchema), handler);

export default router;
