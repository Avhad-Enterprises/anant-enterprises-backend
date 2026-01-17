/**
 * PUT /api/users/:userId/addresses/:id
 * Update address
 * - Users can update their own addresses
 * - Users with users:write permission can update any user's addresses
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth, requireOwnerOrPermission, validationMiddleware } from '../../../middlewares';
import { ResponseFormatter, HttpException, uuidSchema, shortTextSchema } from '../../../utils';
import { db } from '../../../database';
import { userAddresses } from '../shared/addresses.schema';

type AddressUpdateData = Partial<{
  updated_at: Date;
  address_type: 'billing' | 'shipping' | 'both' | 'company';
  recipient_name: string;
  phone_country_code: string;
  phone_number: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state_province: string;
  postal_code: string;
  is_default: boolean;
}>;

const paramsSchema = z.object({
  userId: uuidSchema,
  id: uuidSchema,
});

const bodySchema = z.object({
  type: z.enum(['Home', 'Office', 'Other']).optional(),
  name: shortTextSchema.optional(),
  phone: shortTextSchema.optional(),
  addressLine1: shortTextSchema.optional(),
  addressLine2: z.string().optional(),
  city: shortTextSchema.optional(),
  state: shortTextSchema.optional(),
  pincode: shortTextSchema.optional(),
  isDefault: z.boolean().optional(),
});

// Map frontend type to backend address_type enum
const mapToBackendType = (
  type: 'Home' | 'Office' | 'Other'
): 'billing' | 'shipping' | 'both' | 'company' | 'other' => {
  switch (type) {
    case 'Home':
      return 'shipping';
    case 'Office':
      return 'company';
    case 'Other':
      return 'other';
  }
};

const handler = async (req: RequestWithUser, res: Response) => {
  const userId = req.params.userId as string;
  const addressId = req.params.id as string;
  const { type, name, phone, addressLine1, addressLine2, city, state, pincode, isDefault } = req.body;

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

  // Build update data
  const updateData: AddressUpdateData = {
    updated_at: new Date(),
  };

  if (type) {
    updateData.address_type = mapToBackendType(type) as any;
  }
  if (name) {
    updateData.recipient_name = name;
  }
  if (phone) {
    const phoneMatch = phone.match(/^(\+\d{1,3})?\s*(.+)$/);
    updateData.phone_country_code = phoneMatch?.[1] || '';
    updateData.phone_number = phoneMatch?.[2]?.replace(/\s/g, '') || phone;
  }
  if (addressLine1) {
    updateData.address_line1 = addressLine1;
  }
  if (addressLine2 !== undefined) {
    updateData.address_line2 = addressLine2;
  }
  if (city) {
    updateData.city = city;
  }
  if (state) {
    updateData.state_province = state;
  }
  if (pincode) {
    updateData.postal_code = pincode;
  }

  // If setting as default, unset ALL other defaults (only one default allowed)
  if (isDefault !== undefined) {
    updateData.is_default = isDefault;

    if (isDefault) {
      await db
        .update(userAddresses)
        .set({ is_default: false })
        .where(
          and(
            eq(userAddresses.user_id, userId),
            eq(userAddresses.is_deleted, false)
          )
        );
    }
  }

  // Update address
  const [updatedAddress] = await db
    .update(userAddresses)
    .set(updateData)
    .where(eq(userAddresses.id, addressId))
    .returning();

  ResponseFormatter.success(
    res,
    {
      id: updatedAddress.id,
      type:
        type ||
        (existingAddress.address_type === 'shipping'
          ? 'Home'
          : existingAddress.address_type === 'company'
            ? 'Office'
            : 'Other'),
      name: updatedAddress.recipient_name,
      phone:
        phone ||
        `${existingAddress.phone_country_code || ''}${existingAddress.phone_number || ''}`.trim(),
      addressLine1: updatedAddress.address_line1,
      addressLine2: updatedAddress.address_line2 || '',
      city: updatedAddress.city,
      state: updatedAddress.state_province,
      pincode: updatedAddress.postal_code,
      isDefault: updatedAddress.is_default,
    },
    'Address updated successfully'
  );
};

const router = Router();
router.put(
  '/:userId/addresses/:id',
  requireAuth,
  validationMiddleware(paramsSchema, 'params'),
  validationMiddleware(bodySchema, 'body'),
  requireOwnerOrPermission('userId', 'users:update'),
  handler
);

export default router;
