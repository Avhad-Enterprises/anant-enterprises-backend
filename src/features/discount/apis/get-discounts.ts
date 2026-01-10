import { Router, Response, NextFunction } from 'express';
import { discountService } from '../services';
import { logger } from '../../../utils';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { requirePermission } from '../../../middlewares/permission.middleware';
import { RequestWithUser } from '../../../interfaces';

const router = Router();

router.get(
    '/',
    requireAuth,
    requirePermission('discounts:read'),
    async (req: RequestWithUser, res: Response, next: NextFunction) => {
        try {
            const page = req.query.page ? parseInt(req.query.page as string) : 1;
            const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
            const search = req.query.search as string;
            const status = req.query.status as any;
            const type = req.query.type as any;
            const sort = req.query.sort as any;

            const result = await discountService.getDiscounts({
                page,
                limit,
                search,
                status,
                type,
                sort,
            });

            res.status(200).json({
                success: true,
                message: 'Discounts retrieved successfully',
                data: result.data,
                meta: result.meta,
            });
        } catch (error) {
            logger.error('Error retrieving discounts:', error);
            next(error);
        }
    }
);

export default router;
