import { Router, Response, NextFunction } from 'express';
import { discountService } from '../services';
import { logger, HttpException } from '../../../utils';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { requirePermission } from '../../../middlewares/permission.middleware';
import { RequestWithUser } from '../../../interfaces';

const router = Router();

router.get(
    '/:id',
    requireAuth,
    requirePermission('discounts:read'),
    async (req: RequestWithUser, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params as unknown as { id: string };
            const discount = await discountService.getDiscountById(id);

            if (!discount) {
                throw new HttpException(404, 'Discount not found');
            }

            res.status(200).json({
                success: true,
                message: 'Discount retrieved successfully',
                data: discount,
            });
        } catch (error) {
            logger.error(`Error retrieving discount ${req.params.id}:`, error);
            next(error);
        }
    }
);

export default router;
