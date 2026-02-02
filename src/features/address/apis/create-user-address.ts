/**
 * POST /api/users/:userId/addresses
 * Create new address
 * - Users can create their own addresses
 * - Users with users:write permission can create addresses for any user
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
import { ResponseFormatter, uuidSchema, shortTextSchema } from '../../../utils';
import { db } from '../../../database';
import { userAddresses } from '../shared/addresses.schema';

const paramsSchema = z.object({
  userId: uuidSchema,
});

const bodySchema = z.object({
  type: z.enum(['Home', 'Office', 'Warehouse', 'Other']),
  name: shortTextSchema,
  phone: shortTextSchema,
  addressLine1: shortTextSchema,
  addressLine2: z.string().optional(),
  city: shortTextSchema,
  state: shortTextSchema,
  pincode: shortTextSchema,
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

const handler = async (req: RequestWithUser, res: Response) => {
  const userId = req.params.userId as string;
  const { type, name, phone, addressLine1, addressLine2, city, state, pincode, country, isDefaultShipping, isDefaultBilling, deliveryInstructions } =
    req.body;

  const addressLabel = mapToBackendLabel(type);
  const setAsDefaultShipping = isDefaultShipping || false;
  const setAsDefaultBilling = isDefaultBilling || false;

  // If setting as default shipping, unset other default shipping addresses
  if (setAsDefaultShipping) {
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

  // If setting as default billing, unset other default billing addresses
  if (setAsDefaultBilling) {
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

  // Parse phone number (assuming format like "+91 98765 43210")
  const phoneMatch = phone.match(/^(\+\d{1,3})?\s*(.+)$/);
  const phoneCountryCode = phoneMatch?.[1] || '';
  const phoneNumber = phoneMatch?.[2]?.replace(/\s/g, '') || phone;

  // Create new address
  const [newAddress] = await db
    .insert(userAddresses)
    .values({
      user_id: userId,
      address_label: addressLabel,
      is_default_shipping: setAsDefaultShipping,
      is_default_billing: setAsDefaultBilling,
      recipient_name: name,
      phone_number: phoneNumber,
      phone_country_code: phoneCountryCode,
      address_line1: addressLine1,
      address_line2: addressLine2,
      city: city,
      state_province: state,
      postal_code: pincode,
      country: country || 'India',
      country_code: country === 'India' ? 'IN' : 'XX',
      delivery_instructions: deliveryInstructions,
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
      isDefaultShipping: newAddress.is_default_shipping,
      isDefaultBilling: newAddress.is_default_billing,
      deliveryInstructions: newAddress.delivery_instructions,
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
