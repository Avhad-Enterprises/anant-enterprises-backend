/**
 * PATCH /api/users/:userId/addresses/:id/default
 * Set address as default
 * - Users can set their own addresses as default
 * - Users with users:write permission can set any user's addresses as default
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
    id: z.string().uuid('Address ID must be a valid UUID'),
});

const handler = async (req: RequestWithUser, res: Response) => {
    const { userId, id: addressId } = req.params;

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

    // Unset other defaults of the same type
    await db
        .update(userAddresses)
        .set({ is_default: false })
        .where(
            and(
                eq(userAddresses.user_id, userId),
                eq(userAddresses.address_type, existingAddress.address_type),
                eq(userAddresses.is_deleted, false)
            )
        );

    // Set this address as default
    await db
        .update(userAddresses)
        .set({
            is_default: true,
            updated_at: new Date(),
        })
        .where(eq(userAddresses.id, addressId));

    ResponseFormatter.success(
        res,
        { id: addressId, isDefault: true },
        'Address set as default successfully'
    );
};

const router = Router();
router.patch(
    '/:userId/addresses/:id/default',
    requireAuth,
    validationMiddleware(paramsSchema, 'params'),
    requireOwnerOrPermission('userId', 'users:write'),
    handler
);

export default router;
