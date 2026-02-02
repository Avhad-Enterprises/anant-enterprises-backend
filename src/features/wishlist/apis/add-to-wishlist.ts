/**
 * POST /api/wishlist/items
 * Add a product to the wishlist
 * - Requires authentication
 * - Creates wishlist if doesn't exist
 * - Prevents duplicates
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { ResponseFormatter } from '../../../utils';
import { HttpException } from '../../../utils';
import { db } from '../../../database';
import { wishlists } from '../shared/wishlist.schema';
import { wishlistItems } from '../shared/wishlist-items.schema';
import { products } from '../../product/shared/products.schema';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth, requireOwnerOrPermission, validationMiddleware } from '../../../middlewares';
import { randomBytes } from 'crypto';

// Validation schema
const addToWishlistSchema = z.object({
    product_id: z.string().uuid().optional(), // Optional in body if provided in params
    notes: z.string().max(500).optional(),
});

const paramsSchema = z.object({
    userId: z.string().uuid(),
    productId: z.string().uuid(),
});

/**
 * Get or create wishlist for user
 */
async function getOrCreateWishlist(userId: string): Promise<string> {
    // Find existing wishlist
    const [existingWishlist] = await db
        .select({ id: wishlists.id })
        .from(wishlists)
        .where(and(
            eq(wishlists.user_id, userId),
            eq(wishlists.status, true)
        ))
        .limit(1);

    if (existingWishlist) {
        return existingWishlist.id;
    }

    // Create new wishlist with shareable access token
    const accessToken = randomBytes(32).toString('hex');
    const [newWishlist] = await db.insert(wishlists).values({
        user_id: userId,
        access_token: accessToken,
        status: true,
    }).returning({ id: wishlists.id });

    if (!newWishlist) {
        throw new HttpException(500, 'Failed to create wishlist');
    }

    return newWishlist.id;
}


const handler = async (req: RequestWithUser, res: Response) => {
    // Support admin/owner access via params
    const targetUserId = req.params.userId || req.userId;
    if (!targetUserId) {
        throw new HttpException(401, 'Authentication required');
    }

    const body = addToWishlistSchema.parse(req.body);
    // Support productId from params (old user route) or body
    const product_id = req.params.productId || body.product_id;
    const notes = body.notes;

    if (!product_id) {
        throw new HttpException(400, 'Product ID is required');
    }

    // Validate product exists and is active
    const [product] = await db
        .select({
            id: products.id,
            product_title: products.product_title,
            status: products.status,
        })
        .from(products)
        .where(and(
            eq(products.id, product_id),
            eq(products.is_deleted, false)
        ))
        .limit(1);

    if (!product) {
        throw new HttpException(404, 'Product not found');
    }

    if (product.status !== 'active') {
        throw new HttpException(400, 'Product is not available');
    }

    // Get or create wishlist
    const wishlistId = await getOrCreateWishlist(targetUserId);

    // Check if already in wishlist
    const [existingItem] = await db
        .select({ product_id: wishlistItems.product_id })
        .from(wishlistItems)
        .where(and(
            eq(wishlistItems.wishlist_id, wishlistId),
            eq(wishlistItems.product_id, product_id)
        ))
        .limit(1);

    if (existingItem) {
        return ResponseFormatter.success(res, {
            product_id,
            already_exists: true,
        }, `${product.product_title} is already in your wishlist`);
    }

    // Add to wishlist
    await db.insert(wishlistItems).values({
        wishlist_id: wishlistId,
        product_id,
        notes: notes || null,
    });

    // Update wishlist timestamp
    await db.update(wishlists)
        .set({ updated_at: new Date() })
        .where(eq(wishlists.id, wishlistId));

    return ResponseFormatter.success(res, {
        product_id,
        product_name: product.product_title,
        already_exists: false,
    }, `${product.product_title} added to wishlist`, 201);
};

const router = Router();

// Admin route only - add to any user's wishlist
router.post(
    '/:userId/wishlist/:productId',
    requireAuth,
    validationMiddleware(paramsSchema, 'params'),
    requireOwnerOrPermission('userId', 'users:write'),
    handler
);

export default router;
