/**
 * PUT /api/users/:userId/addresses/:id
 * Update address
 * - Users can update their own addresses
 * - Users with users:write permission can update any user's addresses
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq, and, inArray } from 'drizzle-orm';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth, requireOwnerOrPermission, validationMiddleware } from '../../../middlewares';
import { ResponseFormatter, HttpException, uuidSchema, shortTextSchema } from '../../../utils';
import { db } from '../../../database';
import { userAddresses } from '../shared/addresses.schema';
import { IAddressUpdateInput } from '../shared/interface';

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
  country: shortTextSchema.optional(),
  isDefault: z.boolean().optional(),
  isDefaultBilling: z.boolean().optional(),
  isDefaultShipping: z.boolean().optional(),
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
  const { type, name, phone, addressLine1, addressLine2, city, state, pincode, country, isDefault, isDefaultBilling, isDefaultShipping } = req.body;

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

  // Determine Type and Default Status
  let backendType = type ? mapToBackendType(type) : existingAddress.address_type;
  let finalIsDefault = isDefault !== undefined ? isDefault : existingAddress.is_default;

  // If new default flags are provided, they take precedence
  if (isDefaultBilling !== undefined || isDefaultShipping !== undefined) {
    const isBilling = isDefaultBilling !== undefined ? isDefaultBilling : (backendType === 'billing' || backendType === 'both');
    const isShipping = isDefaultShipping !== undefined ? isDefaultShipping : (backendType === 'shipping' || backendType === 'both');

    finalIsDefault = isBilling || isShipping;

    if (isBilling && isShipping) {
      backendType = 'both';
    } else if (isBilling) {
      backendType = 'billing';
    } else if (isShipping) {
      backendType = 'shipping';
    }
  }

  // Build update data
  const updateData: IAddressUpdateInput & { country?: string; country_code?: string; updated_at: Date } = {
    updated_at: new Date(),
  };

  updateData.address_type = backendType as any;
  updateData.is_default = finalIsDefault;

  if (country) {
    updateData.country = country;
    updateData.country_code = country === 'India' ? 'IN' : 'XX';
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

  // If setting as default, unset other defaults for this type
  if (finalIsDefault) {
    const typesToClear: string[] = ['both'];
    if (backendType === 'both') {
      typesToClear.push('billing', 'shipping');
    } else {
      typesToClear.push(backendType);
    }

    await db
      .update(userAddresses)
      .set({ is_default: false })
      .where(
        and(
          eq(userAddresses.user_id, userId),
          eq(userAddresses.is_deleted, false),
          inArray(userAddresses.address_type, typesToClear as any[])
        )
      );
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
      country: updatedAddress.country,
      isDefault: updatedAddress.is_default,
      isDefaultBilling: updatedAddress.address_type === 'billing' || updatedAddress.address_type === 'both',
      isDefaultShipping: updatedAddress.address_type === 'shipping' || updatedAddress.address_type === 'both',
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
