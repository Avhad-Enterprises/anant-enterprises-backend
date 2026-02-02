/**
 * PATCH /api/users/:userId/addresses/:id/default
 * Set address as default (for shipping and/or billing)
 * - Users can set their own addresses as default
 * - Users with users:write permission can set any user's addresses as default
 * 
 * Query params:
 * - type: 'shipping' | 'billing' | 'both' (default: 'both')
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth, requireOwnerOrPermission, validationMiddleware } from '../../../middlewares';
import { ResponseFormatter, HttpException, uuidSchema } from '../../../utils';
import { db } from '../../../database';
import { userAddresses } from '../shared/addresses.schema';

const paramsSchema = z.object({
  userId: uuidSchema,
  id: uuidSchema,
});

const querySchema = z.object({
  type: z.enum(['shipping', 'billing', 'both']).default('both'),
});

const handler = async (req: RequestWithUser, res: Response) => {
  const userId = req.params.userId as string;
  const addressId = req.params.id as string;
  const { type } = querySchema.parse(req.query);

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

  const setShipping = type === 'shipping' || type === 'both';
  const setBilling = type === 'billing' || type === 'both';

  // Unset other default shipping addresses if needed
  if (setShipping) {
    await db
      .update(userAddresses)
      .set({ is_default_shipping: false })
      .where(
        and(
          eq(userAddresses.user_id, userId),
          eq(userAddresses.is_deleted, false),
          eq(userAddresses.is_default_shipping, true)
        )
      );
  }

  // Unset other default billing addresses if needed
  if (setBilling) {
    await db
      .update(userAddresses)
      .set({ is_default_billing: false })
      .where(
        and(
          eq(userAddresses.user_id, userId),
          eq(userAddresses.is_deleted, false),
          eq(userAddresses.is_default_billing, true)
        )
      );
  }

  // Set this address as default
  const updateData: Record<string, unknown> = {
    updated_at: new Date(),
  };
  if (setShipping) updateData.is_default_shipping = true;
  if (setBilling) updateData.is_default_billing = true;

  await db
    .update(userAddresses)
    .set(updateData)
    .where(eq(userAddresses.id, addressId));

  ResponseFormatter.success(
    res,
    { 
      id: addressId, 
      isDefaultShipping: setShipping, 
      isDefaultBilling: setBilling 
    },
    'Address set as default successfully'
  );
};

const router = Router();
router.patch(
  '/:userId/addresses/:id/default',
  requireAuth,
  validationMiddleware(paramsSchema, 'params'),
  requireOwnerOrPermission('userId', 'users:update'),
  handler
);

export default router;
