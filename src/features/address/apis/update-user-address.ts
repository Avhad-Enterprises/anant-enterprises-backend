/**
 * PUT /api/users/:userId/addresses/:id
 * Update address
 * - Users can update their own addresses
 * - Users with users:write permission can update any user's addresses
 * 
 * Uses Label vs Role pattern:
 * - Label (type): Where is the address? (Home, Office, Warehouse, Other)
 * - Roles (isDefaultShipping, isDefaultBilling): What is it used for?
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth, requireOwnerOrPermission, validationMiddleware } from '../../../middlewares';
import { ResponseFormatter, HttpException, uuidSchema, shortTextSchema } from '../../../utils';
import { db } from '../../../database';
import { userAddresses } from '../shared/addresses.schema';

const paramsSchema = z.object({
  userId: uuidSchema,
  id: uuidSchema,
});

const bodySchema = z.object({
  type: z.enum(['Home', 'Office', 'Warehouse', 'Other']).optional(),
  name: shortTextSchema.optional(),
  phone: shortTextSchema.optional(),
  addressLine1: shortTextSchema.optional(),
  addressLine2: z.string().optional(),
  city: shortTextSchema.optional(),
  state: shortTextSchema.optional(),
  pincode: shortTextSchema.optional(),
  country: shortTextSchema.optional(),
  isDefaultShipping: z.boolean().optional(),
  isDefaultBilling: z.boolean().optional(),
  deliveryInstructions: z.string().optional(),
});

// Map frontend type to backend address_label enum
const mapToBackendLabel = (
  type: 'Home' | 'Office' | 'Warehouse' | 'Other'
): 'home' | 'office' | 'warehouse' | 'other' => {
  return type.toLowerCase() as 'home' | 'office' | 'warehouse' | 'other';
};

// Map backend label to frontend type
const mapToFrontendType = (
  label: 'home' | 'office' | 'warehouse' | 'other'
): 'Home' | 'Office' | 'Warehouse' | 'Other' => {
  const map: Record<string, 'Home' | 'Office' | 'Warehouse' | 'Other'> = {
    home: 'Home',
    office: 'Office',
    warehouse: 'Warehouse',
    other: 'Other',
  };
  return map[label] || 'Other';
};

const handler = async (req: RequestWithUser, res: Response) => {
  const userId = req.params.userId as string;
  const addressId = req.params.id as string;
  const { type, name, phone, addressLine1, addressLine2, city, state, pincode, country, isDefaultShipping, isDefaultBilling, deliveryInstructions } = req.body;

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
  const updateData: Record<string, unknown> = {
    updated_at: new Date(),
  };

  // Update label if type is provided
  if (type) {
    updateData.address_label = mapToBackendLabel(type);
  }

  // Handle default shipping
  if (isDefaultShipping !== undefined) {
    if (isDefaultShipping) {
      // Unset other default shipping addresses first
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
    updateData.is_default_shipping = isDefaultShipping;
  }

  // Handle default billing
  if (isDefaultBilling !== undefined) {
    if (isDefaultBilling) {
      // Unset other default billing addresses first
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
    updateData.is_default_billing = isDefaultBilling;
  }

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
  if (deliveryInstructions !== undefined) {
    updateData.delivery_instructions = deliveryInstructions;
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
      type: type || mapToFrontendType(updatedAddress.address_label),
      name: updatedAddress.recipient_name,
      phone: phone || `${existingAddress.phone_country_code || ''}${existingAddress.phone_number || ''}`.trim(),
      addressLine1: updatedAddress.address_line1,
      addressLine2: updatedAddress.address_line2 || '',
      city: updatedAddress.city,
      state: updatedAddress.state_province,
      pincode: updatedAddress.postal_code,
      country: updatedAddress.country,
      isDefaultShipping: updatedAddress.is_default_shipping,
      isDefaultBilling: updatedAddress.is_default_billing,
      deliveryInstructions: updatedAddress.delivery_instructions,
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
