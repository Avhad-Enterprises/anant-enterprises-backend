/**
 * DELETE /api/cart/discount
 * DELETE /api/cart/discount/:code
 * Remove a discount code from the cart
 */

import { Router, Response, Request } from 'express';
import { ResponseFormatter } from '../../../utils';
import { RequestWithUser } from '../../../interfaces';
import { cartService } from '../services';
import { optionalAuth } from '../../../middlewares/auth.middleware';

const handler = async (req: Request, res: Response) => {
    const userReq = req as RequestWithUser;
    const userId = userReq.userId || undefined;
    const sessionId = req.headers['x-session-id'] as string || undefined;
    const code = req.params.code as string | undefined; // Optional

    const cart = await cartService.getOrCreateCart(userId, sessionId);

    // Remove discount
    const updatedCart = await cartService.removeDiscount(cart.id, code);

    return ResponseFormatter.success(res, updatedCart, 'Discount code removed successfully');
};

const router = Router();
router.delete('/discount', optionalAuth, handler);
router.delete('/discount/:code', optionalAuth, handler);

export default router;
