import { Router, Response, NextFunction } from 'express';
import { discountService } from '../services';
import { logger, HttpException } from '../../../utils';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { requirePermission } from '../../../middlewares/permission.middleware';
import { RequestWithUser } from '../../../interfaces';

const router = Router();

router.delete(
    '/:id',
    requireAuth,
    requirePermission('discounts:delete'),
    async (req: RequestWithUser, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params as unknown as { id: string };
            const deletedBy = req.userId;

            const result = await discountService.deleteDiscount(id, deletedBy);

            if (!result) {
                throw new HttpException(404, 'Discount not found');
            }

            res.status(200).json({
                success: true,
                message: 'Discount deleted successfully',
            });
        } catch (error) {
            logger.error(`Error deleting discount ${req.params.id}:`, error);
            next(error);
        }
    }
);

export default router;
