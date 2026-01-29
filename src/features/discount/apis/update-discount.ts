import { Router, Response, NextFunction } from 'express';
import { discountService, UpdateDiscountInput } from '../services';
import { logger, HttpException } from '../../../utils';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { requirePermission } from '../../../middlewares/permission.middleware';
import { RequestWithUser } from '../../../interfaces';

const router = Router();

router.put(
    '/:id',
    requireAuth,
    requirePermission('discounts:update'),
    async (req: RequestWithUser, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params as unknown as { id: string };
            const input: UpdateDiscountInput = {
                ...req.body,
                // Ensure dates are parsed correctly if provided
                starts_at: req.body.starts_at ? new Date(req.body.starts_at) : undefined,
                ends_at: req.body.ends_at ? new Date(req.body.ends_at) : undefined,
            };

            const discount = await discountService.updateDiscount(id, input);

            if (!discount) {
                throw new HttpException(404, 'Discount not found');
            }

            res.status(200).json({
                success: true,
                message: 'Discount updated successfully',
                data: discount,
            });
        } catch (error) {
            logger.error(`Error updating discount ${req.params.id}:`, error);
            next(error);
        }
    }
);

export default router;
