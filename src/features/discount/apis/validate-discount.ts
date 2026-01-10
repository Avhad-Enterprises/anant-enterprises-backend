import { Router, Response, NextFunction } from 'express';
import {
    discountValidationService,
    discountCalculationService,
    ValidationContext
} from '../services';
import { logger, HttpException } from '../../../utils';
import { optionalAuth } from '../../../middlewares/auth.middleware';
import { RequestWithUser } from '../../../interfaces';

const router = Router();

// Validate discount code for cart
router.post(
    '/validate',
    optionalAuth,
    async (req: RequestWithUser, res: Response, next: NextFunction) => {
        try {
            const {
                code,
                cart_items,
                cart_subtotal,
                shipping_address_country,
                shipping_address_region,
                payment_method,
                sales_channel
            } = req.body;

            if (!code) {
                throw new HttpException(400, 'Discount code is required');
            }

            if (!cart_items || !Array.isArray(cart_items) || cart_items.length === 0) {
                throw new HttpException(400, 'Cart items are required');
            }

            // Build context
            const context: ValidationContext = {
                code,
                cart_items,
                cart_subtotal,
                user_id: req.userId,
                // For email, we rely on payload or would need to fetch user if strictly required
                user_email: req.body.email,
                is_new_customer: req.body.is_new_customer,
                shipping_address_country,
                shipping_address_region,
                payment_method,
                sales_channel: sales_channel || 'online_store',
            };

            // 1. Validate
            const validationResult = await discountValidationService.validateDiscountCode(context);

            if (!validationResult.valid || !validationResult.discount) {
                return res.status(200).json({
                    success: false,
                    valid: false,
                    error_code: validationResult.error_code,
                    message: validationResult.message,
                });
            }

            // 2. Calculate preview
            const calculationResult = await discountCalculationService.calculateDiscount(
                validationResult.discount,
                {
                    cart_items: context.cart_items,
                    cart_subtotal: context.cart_subtotal,
                    shipping_amount: req.body.shipping_amount,
                },
                validationResult.applicable_items
            );

            return res.status(200).json({
                success: true,
                valid: true,
                code: validationResult.discount_code, // Return normalized code
                discount: {
                    id: validationResult.discount.id,
                    title: validationResult.discount.title,
                    type: validationResult.discount.type,
                    value: validationResult.discount.value,
                },
                calculation: calculationResult,
            });
        } catch (error) {
            logger.error('Error validating discount code:', error);
            return next(error);
        }
    }
);

export default router;
