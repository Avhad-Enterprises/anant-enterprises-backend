/**
 * GET /api/inventory
 * Get all inventory items with pagination and filtering
 * 
 * TODO: TEMPORARY - Add requireAuth and requirePermission('inventory:read') after fixing middleware circular dependency
 */

import { Router, Response, Request } from 'express';
import { z } from 'zod';
import { ResponseFormatter, logger } from '../../../utils';
import { getInventoryList } from '../services/inventory.service';

const querySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().optional(),
    condition: z.enum(['sellable', 'damaged', 'quarantined', 'expired']).optional(),
    status: z.enum(['in_stock', 'low_stock', 'out_of_stock']).optional(),
    location: z.string().optional(),
});

const handler = async (req: Request, res: Response) => {
    try {
        const params = querySchema.parse(req.query);
        logger.info('GET /api/inventory', { params });

        const result = await getInventoryList(params);

        // DEBUG: Log the service result
        console.log('=== INVENTORY API DEBUG ===');
        console.log('Service returned:', {
            itemsCount: result.items.length,
            total: result.total,
            page: result.page,
            limit: result.limit,
            firstItem: result.items[0] ? {
                id: result.items[0].id,
                product_name: result.items[0].product_name,
                location_id: result.items[0].location_id,
            } : 'No items',
        });

        // This will format the response as { success, data, message, meta }
        const formattedResponse = {
            success: true,
            data: result.items,
            message: 'Inventory retrieved successfully',
            meta: {
                timestamp: new Date().toISOString(),
                pagination: {
                    page: result.page,
                    limit: result.limit,
                    total: result.total,
                },
            },
        };

        console.log('Response structure:', {
            success: formattedResponse.success,
            dataIsArray: Array.isArray(formattedResponse.data),
            dataLength: formattedResponse.data.length,
            hasMeta: !!formattedResponse.meta,
            pagination: formattedResponse.meta.pagination,
        });
        console.log('=== END DEBUG ===');

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
// TODO: TEMPORARY - No auth middleware to avoid circular dependency
// router.get('/', requireAuth, requirePermission('inventory:read'), handler);
router.get('/', handler);

export default router;
