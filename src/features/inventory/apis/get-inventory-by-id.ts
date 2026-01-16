/**
 * GET /api/inventory/:id
 * Get single inventory item with product details
 * 
 * IMPORTANT: This route uses 'next()' to skip to next route when ID is not a valid UUID.
 * This allows GET /api/inventory (list) to work correctly.
 */

import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { RequestWithUser } from '../../../interfaces';
import { ResponseFormatter, uuidSchema, HttpException, logger } from '../../../utils';
import { getInventoryById } from '../services/inventory.service';

const paramsSchema = z.object({
    id: uuidSchema,
});

const handler = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params as { id: string };

        // If no ID provided or ID is not a valid UUID, skip to next route
        // This allows GET /api/inventory (list endpoint) to work
        if (!id) {
            return next('route');
        }

        const validation = paramsSchema.safeParse({ id });
        if (!validation.success) {
            // Not a valid UUID - this might be intended for another route (like list)
            return next('route');
        }

        logger.info(`GET /api/inventory/${id}`);

        const item = await getInventoryById(id);

        if (!item) {
            throw new HttpException(404, 'Inventory item not found');
        }

        ResponseFormatter.success(res, item, 'Inventory item retrieved successfully');
    } catch (error) {
        logger.error('Error in get-inventory-by-id:', error);
        next(error);
    }
};

const router = Router();
router.get('/:id', handler);

export default router;
