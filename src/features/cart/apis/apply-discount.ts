/**
 * POST /api/cart/discount
 * Apply a discount code to the cart
 */

import { Router, Response, Request } from 'express';
import { z } from 'zod';
import { ResponseFormatter } from '../../../utils';
import { RequestWithUser } from '../../../interfaces';
import { cartService } from '../services';
import { optionalAuth } from '../../../middlewares/auth.middleware';

const applyDiscountSchema = z.object({
    code: z.string().min(1, 'Discount code is required'),
});

const handler = async (req: Request, res: Response) => {
    const userReq = req as RequestWithUser;
    const userId = userReq.userId || undefined;
    const sessionId = req.headers['x-session-id'] as string || undefined;

    const { code } = applyDiscountSchema.parse(req.body);

    // Get cart logic - improved to ensure we have a cart to apply to
    const cart = await cartService.getOrCreateCart(userId, sessionId);

    // Apply discount
    const updatedCart = await cartService.applyDiscount(cart.id, code, userId);

    return ResponseFormatter.success(res, updatedCart, 'Discount code applied successfully');
};

const router = Router();
router.post('/discount', optionalAuth, handler);

export default router;
