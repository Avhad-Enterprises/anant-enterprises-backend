/**
 * GET /api/inventory/products/:productId/history
 * Get inventory adjustment history for a product with pagination
 */

import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { RequestWithUser } from '../../../interfaces';
import { ResponseFormatter, uuidSchema, HttpException, logger } from '../../../utils';
import { getInventoryHistoryByProductId } from '../services/inventory.service';
import { requireAuth, requirePermission } from '../../../middlewares';

const paramsSchema = z.object({
    productId: uuidSchema,
});

const querySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});

const handler = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
        const { productId } = req.params as { productId: string };

        // Validate UUID
        const paramsValidation = paramsSchema.safeParse({ productId });
        if (!paramsValidation.success) {
            throw new HttpException(400, 'Invalid product ID format');
        }

        const { page, limit } = querySchema.parse(req.query);

        logger.info(`GET /api/inventory/products/${productId}/history`, { page, limit });

        const result = await getInventoryHistoryByProductId(productId, page, limit);

        ResponseFormatter.paginated(
            res,
            result.items,
            { page: result.page, limit: result.limit, total: result.total },
            'Inventory history retrieved successfully'
        );
    } catch (error) {
        logger.error('Error in get-inventory-history-by-product:', error);
        next(error);
    }
};

const router = Router();
router.get('/products/:productId/history', requireAuth, requirePermission('inventory:read'), handler);

export default router;
