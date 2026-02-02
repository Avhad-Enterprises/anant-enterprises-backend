/**
 * GET /api/inventory
 * Get all inventory items with pagination and filtering
 */

import { Router, Response, Request } from 'express';
import { z } from 'zod';
import { ResponseFormatter, logger } from '../../../utils';
import { getInventoryList } from '../services/inventory.service';
import { requireAuth, requirePermission } from '../../../middlewares';

const querySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().optional(),
    condition: z.enum(['sellable', 'damaged', 'quarantined', 'expired']).optional(),
    status: z.enum(['in_stock', 'low_stock', 'out_of_stock']).optional(),
    location: z.string().optional(),
    category: z.string().optional(),
    quickFilter: z.string().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    _rid: z.string().optional(),
});

const handler = async (req: Request, res: Response) => {
    try {
        const params = querySchema.parse(req.query);
        logger.info('GET /api/inventory', { params });

        const result = await getInventoryList(params);

        ResponseFormatter.paginated(
            res,
            result.items,
            { page: result.page, limit: result.limit, total: result.total },
            'Inventory retrieved successfully'
        );
    } catch (error) {
        logger.error('Error in get-all-inventory:', error);
        throw error;
    }
};

const router = Router();
router.get('/', requireAuth, requirePermission('inventory:read'), handler);

export default router;
