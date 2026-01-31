/**
 * POST /api/inventory/variants/:variantId/adjust
 * Adjust inventory quantity for a product variant
 */

import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { RequestWithUser } from '../../../interfaces';
import { ResponseFormatter, uuidSchema, HttpException, logger } from '../../../utils';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { adjustVariantInventory } from '../services/variant-inventory.service';

const paramsSchema = z.object({
    variantId: uuidSchema,
});

const bodySchema = z.object({
    quantity_change: z.number().int().refine((val) => val !== 0, {
        message: 'Quantity change cannot be zero',
    }),
    reason: z.string().min(3).max(500),
    reference_number: z.string().optional(),
    notes: z.string().optional(),
});

const handler = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
        const { variantId } = req.params as { variantId: string };
        const userId = req.userId;

        if (!userId) {
            throw new HttpException(401, 'Authentication required');
        }

        // Validate Params
        const paramsValidation = paramsSchema.safeParse({ variantId });
        if (!paramsValidation.success) {
            throw new HttpException(400, 'Invalid variant ID format');
        }

        // Validate Body
        const validation = bodySchema.safeParse(req.body);
        if (!validation.success) {
            const errorMessage = validation.error.issues
                .map((e) => `${e.path.join('.')}: ${e.message}`)
                .join(', ');
            throw new HttpException(400, errorMessage);
        }

        const { quantity_change, reason, reference_number, notes } = validation.data;

        logger.info(`Adjusting inventory for variant ${variantId}`, { quantity_change, reason, userId });

        const result = await adjustVariantInventory(
            variantId,
            { quantity_change, reason, reference_number, notes },
            userId
        );

        ResponseFormatter.success(
            res,
            result,
            'Variant inventory adjusted successfully'
        );
    } catch (error) {
        logger.error('Error in adjust-variant-inventory:', error);
        next(error);
    }
};

const router = Router();
router.post('/variants/:variantId/adjust', (req, res, next) => requireAuth(req, res, next), handler);

export default router;
