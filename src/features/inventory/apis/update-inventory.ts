/**
 * PUT /api/inventory/:id
 * Update inventory fields (condition, location, incoming stock)
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { RequestWithUser } from '../../../interfaces';
import { ResponseFormatter, uuidSchema, HttpException, logger } from '../../../utils';
import { updateInventory, getInventoryById } from '../services/inventory.service';
import { requireAuth, requirePermission } from '../../../middlewares';

const paramsSchema = z.object({
    id: uuidSchema,
});

const bodySchema = z.object({
    condition: z.enum(['sellable', 'damaged', 'quarantined', 'expired']).optional(),
    location: z.string().max(255).optional(),
    incoming_quantity: z.number().int().min(0).optional(),
    incoming_po_reference: z.string().max(100).optional(),
    incoming_eta: z.string().datetime().optional(),
});

const handler = async (req: RequestWithUser, res: Response) => {
    try {
        const { id } = req.params as { id: string };

        // Validate UUID inline (prevents route conflict)
        const paramsValidation = paramsSchema.safeParse({ id });
        if (!paramsValidation.success) {
            throw new HttpException(400, 'Invalid inventory ID format');
        }

        // Validate body
        const bodyValidation = bodySchema.safeParse(req.body);
        if (!bodyValidation.success) {
            throw new HttpException(400, bodyValidation.error.issues[0]?.message || 'Invalid request body');
        }

        const data = bodyValidation.data;
        const userId = req.userId;

        if (!userId) {
            throw new HttpException(401, 'Unauthorized: User ID required for audit logging');
        }

        logger.info(`PUT /api/inventory/${id}`, { data });

        const existing = await getInventoryById(id);
        if (!existing) {
            throw new HttpException(404, 'Inventory item not found');
        }

        const updated = await updateInventory(id, data, userId);

        ResponseFormatter.success(res, updated, 'Inventory updated successfully');
    } catch (error) {
        logger.error('Error in update-inventory:', error);
        throw error;
    }
};

const router = Router();
router.put('/:id', requireAuth, requirePermission('inventory:update'), handler);

export default router;
