import { Router, Response, NextFunction } from 'express';
import { discountService, discountCodeService } from '../services';
import { logger, HttpException } from '../../../utils';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { requirePermission } from '../../../middlewares/permission.middleware';
import { RequestWithUser } from '../../../interfaces';

const router = Router();

// Toggle Status (Active <-> Inactive)
router.post(
    '/:id/toggle',
    requireAuth,
    requirePermission('discounts:update'),
    async (req: RequestWithUser, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params as unknown as { id: string };
            const discount = await discountService.toggleStatus(id);

            if (!discount) {
                throw new HttpException(404, 'Discount not found');
            }

            res.status(200).json({
                success: true,
                message: `Discount status changed to ${discount.status}`,
                data: discount,
            });
        } catch (error) {
            logger.error(`Error toggling discount ${req.params.id}:`, error);
            next(error);
        }
    }
);

// Duplicate Discount
router.post(
    '/:id/duplicate',
    requireAuth,
    requirePermission('discounts:create'),
    async (req: RequestWithUser, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params as unknown as { id: string };
            const createdBy = req.userId;

            const discount = await discountService.duplicateDiscount(id, createdBy);

            if (!discount) {
                throw new HttpException(404, 'Discount not found');
            }

            res.status(201).json({
                success: true,
                message: 'Discount duplicated successfully',
                data: discount,
            });
        } catch (error) {
            logger.error(`Error duplicating discount ${req.params.id}:`, error);
            next(error);
        }
    }
);

// Get Discount Stats
router.get(
    '/:id/stats',
    requireAuth,
    requirePermission('discounts:read'),
    async (req: RequestWithUser, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params as unknown as { id: string };
            const stats = await discountService.getDiscountStats(id);

            if (!stats) {
                throw new HttpException(404, 'Discount not found');
            }

            res.status(200).json({
                success: true,
                message: 'Discount stats retrieved successfully',
                data: stats,
            });
        } catch (error) {
            logger.error(`Error getting stats for discount ${req.params.id}:`, error);
            next(error);
        }
    }
);

// Generate Bulk Codes
router.post(
    '/:id/generate-codes',
    requireAuth,
    requirePermission('discounts:update'),
    async (req: RequestWithUser, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params as unknown as { id: string };
            const { count, prefix, length, usage_limit, max_uses_per_customer } = req.body;

            if (!count || count <= 0) {
                throw new HttpException(400, 'Count must be greater than 0');
            }

            const codes = await discountCodeService.generateBulkCodes(id, {
                count,
                prefix,
                length,
                usage_limit,
                max_uses_per_customer,
            });

            res.status(201).json({
                success: true,
                message: `${codes.length} codes generated successfully`,
                data: { codes },
            });
        } catch (error) {
            logger.error(`Error generating codes for discount ${req.params.id}:`, error);
            next(error);
        }
    }
);

export default router;
