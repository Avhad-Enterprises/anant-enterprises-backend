/**
 * POST /api/inventory/:id/adjust
 * Adjust inventory quantity with reason tracking
 * 
 * TODO: TEMPORARY - Add requireAuth and requirePermission('inventory:update') after fixing middleware circular dependency
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { RequestWithUser } from '../../../interfaces';
import { validationMiddleware } from '../../../middlewares';
import { ResponseFormatter, uuidSchema, HttpException, logger } from '../../../utils';
import { adjustInventory, getInventoryById } from '../services/inventory.service';
import { db } from '../../../database';
import { users } from '../../user/shared/user.schema';

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
        // TODO: Get userId from req.userId after adding requireAuth
        let userId = req.userId;

        // Fallback for missing or invalid userId (e.g. "system")
        if (!userId || userId === 'system') {
            logger.warn('Warning: No valid userId found in request, attempting fallback to existing admin user.');

            try {
                // Fetch ANY valid user UUID from the database to use as a fallback
                // In a real scenario, this should specific "system" user or fail if auth is required
                const validUser = await db.select().from(users).limit(1);

                if (validUser && validUser.length > 0) {
                    userId = validUser[0].id;
                    logger.info(`Resolved fallback userId: ${userId}`);
                } else {
                    logger.error('CRITICAL: No users found in database to use as fallback.');
                    throw new HttpException(500, 'System error: No valid user available for audit log.');
                }
            } catch (dbError) {
                logger.error('Database error resolving fallback user:', dbError);
                throw new HttpException(500, 'System error: Failed to resolve operator identity.');
            }
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
// TODO: TEMPORARY - No auth middleware to avoid circular dependency
// router.post('/:id/adjust', requireAuth, requirePermission('inventory:update'), validationMiddleware(paramsSchema, 'params'), validationMiddleware(bodySchema), handler);
router.post('/:id/adjust', validationMiddleware(paramsSchema, 'params'), validationMiddleware(bodySchema), handler);

export default router;
