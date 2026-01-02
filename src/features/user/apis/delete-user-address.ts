/**
 * DELETE /api/users/:userId/addresses/:id
 * Delete address (soft delete)
 * - Users can delete their own addresses
 * - Users with users:delete permission can delete any user's addresses
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth, requireOwnerOrPermission, validationMiddleware } from '../../../middlewares';
import { ResponseFormatter, HttpException } from '../../../utils';
import { db } from '../../../database';
import { userAddresses } from '../shared/addresses.schema';

const paramsSchema = z.object({
    userId: z.string().uuid('User ID must be a valid UUID'),
    id: z.string().transform(Number).pipe(z.number().int().positive()),
});

const handler = async (req: RequestWithUser, res: Response) => {
    const { userId, id } = req.params;
    const addressId = Number(id);

    // Check if address exists and belongs to user
    const [existingAddress] = await db
        .select()
        .from(userAddresses)
        .where(
            and(
                eq(userAddresses.id, addressId),
                eq(userAddresses.user_id, userId),
                eq(userAddresses.is_deleted, false)
            )
        );

    if (!existingAddress) {
        throw new HttpException(404, 'Address not found');
    }

    // Soft delete
    await db
        .update(userAddresses)
        .set({
            is_deleted: true,
            updated_at: new Date(),
        })
        .where(eq(userAddresses.id, addressId));

    ResponseFormatter.success(
        res,
        null,
        'Address deleted successfully'
    );
};

const router = Router();
router.delete(
    '/:userId/addresses/:id',
    requireAuth,
    validationMiddleware(paramsSchema, 'params'),
    requireOwnerOrPermission('userId', 'users:delete'),
    handler
);

export default router;
