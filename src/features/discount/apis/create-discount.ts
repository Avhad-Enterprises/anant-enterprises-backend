import { Router, Response, NextFunction } from 'express';
import { discountService, CreateDiscountInput } from '../services';
import { logger } from '../../../utils';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { requirePermission } from '../../../middlewares/permission.middleware';
import { RequestWithUser } from '../../../interfaces';

const router = Router();

router.post(
    '/',
    requireAuth,
    requirePermission('discounts:create'),
    async (req: RequestWithUser, res: Response, next: NextFunction) => {
        try {
            const input: CreateDiscountInput = {
                ...req.body,
                created_by: req.userId,
                // Ensure dates are parsed correctly
                starts_at: new Date(req.body.starts_at),
                ends_at: req.body.ends_at ? new Date(req.body.ends_at) : undefined,
            };

            const discount = await discountService.createDiscount(input);

            res.status(201).json({
                success: true,
                message: 'Discount created successfully',
                data: discount,
            });
        } catch (error) {
            logger.error('Error creating discount:', error);
            next(error);
        }
    }
);

export default router;
