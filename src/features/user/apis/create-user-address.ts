/**
 * POST /api/users/:userId/addresses
 * Create new address
 * - Users can create their own addresses
 * - Users with users:write permission can create addresses for any user
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq, and, inArray } from 'drizzle-orm';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth, requireOwnerOrPermission, validationMiddleware } from '../../../middlewares';
import { ResponseFormatter, uuidSchema, shortTextSchema } from '../../../utils';
import { db } from '../../../database';
import { userAddresses } from '../shared/addresses.schema';

const paramsSchema = z.object({
  userId: uuidSchema,
});

const bodySchema = z.object({
  type: z.enum(['Home', 'Office', 'Other']),
  name: shortTextSchema,
  phone: shortTextSchema,
  addressLine1: shortTextSchema,
  addressLine2: z.string().optional(),
  city: shortTextSchema,
  state: shortTextSchema,
  pincode: shortTextSchema,
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
  const { type, name, phone, addressLine1, addressLine2, city, state, pincode, country, isDefault, isDefaultBilling, isDefaultShipping } =
    req.body;

  let backendType = mapToBackendType(type);
  let finalIsDefault = isDefault || isDefaultBilling || isDefaultShipping || false;

  // Override type if setting specific defaults
  if (isDefaultBilling && isDefaultShipping) {
    backendType = 'both';
  } else if (isDefaultBilling) {
    backendType = 'billing';
  } else if (isDefaultShipping) {
    backendType = 'shipping';
  }

  // If setting as default, unset other defaults for this type
  if (finalIsDefault) {
    // If setting as 'both', clear defaults for billing, shipping, and both
    // If setting as 'billing', clear defaults for billing and both
    // If setting as 'shipping', clear defaults for shipping and both

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

  // Parse phone number (assuming format like "+91 98765 43210")
  const phoneMatch = phone.match(/^(\+\d{1,3})?\s*(.+)$/);
  const phoneCountryCode = phoneMatch?.[1] || '';
  const phoneNumber = phoneMatch?.[2]?.replace(/\s/g, '') || phone;

  // Create new address
  const [newAddress] = await db
    .insert(userAddresses)
    .values({
      user_id: userId,
      address_type: backendType,
      recipient_name: name,
      phone_number: phoneNumber,
      phone_country_code: phoneCountryCode,
      address_line1: addressLine1,
      address_line2: addressLine2,
      city: city,
      state_province: state,
      postal_code: pincode,
      country: country || 'India',
      country_code: country === 'India' ? 'IN' : 'XX', // Simple fallback
      is_default: finalIsDefault,
    })
    .returning();

  ResponseFormatter.created(
    res,
    {
      id: newAddress.id,
      type,
      name: newAddress.recipient_name,
      phone,
      addressLine1: newAddress.address_line1,
      addressLine2: newAddress.address_line2,
      city: newAddress.city,
      state: newAddress.state_province,
      pincode: newAddress.postal_code,
      country: newAddress.country,
      isDefault: newAddress.is_default,
      isDefaultBilling: newAddress.address_type === 'billing' || newAddress.address_type === 'both',
      isDefaultShipping: newAddress.address_type === 'shipping' || newAddress.address_type === 'both',
    },
    'Address created successfully'
  );
};

const router = Router();
router.post(
  '/:userId/addresses',
  requireAuth,
  validationMiddleware(paramsSchema, 'params'),
  validationMiddleware(bodySchema, 'body'),
  requireOwnerOrPermission('userId', 'users:update'),
  handler
);

export default router;
