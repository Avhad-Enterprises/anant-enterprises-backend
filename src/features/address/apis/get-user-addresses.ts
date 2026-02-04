/**
 * GET /api/users/:userId/addresses
 * Get user addresses
 * - Users can view their own addresses
 * - Users with users:read permission can view any user's addresses
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
import { HttpException, ResponseFormatter, uuidSchema } from '../../../utils';
import { db } from '../../../database';
import { userAddresses } from '../shared/addresses.schema';

const paramsSchema = z.object({
  userId: z.union([uuidSchema, z.literal('me')]),
});

interface AddressResponse {
  id: string;
  type: 'Home' | 'Office' | 'Warehouse' | 'Other';
  name: string;
  phone: string;
  addressLine: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  isDefaultShipping: boolean;
  isDefaultBilling: boolean;
  deliveryInstructions?: string;
}

// Map backend address_label to frontend type (capitalize first letter)
const mapAddressLabel = (label: string): 'Home' | 'Office' | 'Warehouse' | 'Other' => {
  const map: Record<string, 'Home' | 'Office' | 'Warehouse' | 'Other'> = {
    home: 'Home',
    office: 'Office',
    warehouse: 'Warehouse',
    other: 'Other',
  };
  return map[label] || 'Other';
};

const handler = async (req: RequestWithUser, res: Response) => {
  let { userId } = req.params as { userId: string };

  // Handle 'me' alias
  if (userId === 'me') {
    if (!req.userId) {
      throw new HttpException(401, 'Authentication required');
    }
    userId = req.userId;
  }

  // Fetch all non-deleted addresses for the user
  const addresses = await db
    .select()
    .from(userAddresses)
    .where(and(eq(userAddresses.user_id, userId), eq(userAddresses.is_deleted, false)));

  // Map to frontend format
  const addressesResponse: AddressResponse[] = addresses.map(addr => ({
    id: addr.id,
    type: mapAddressLabel(addr.address_label),
    name: addr.recipient_name,
    phone: addr.phone_number ? `${addr.phone_country_code || ''}${addr.phone_number}`.trim() : '',
    addressLine: [addr.address_line1, addr.address_line2].filter(Boolean).join(', '),
    addressLine1: addr.address_line1 || '',
    addressLine2: addr.address_line2 || '',
    city: addr.city,
    state: addr.state_province,
    pincode: addr.postal_code,
    isDefaultShipping: addr.is_default_shipping,
    isDefaultBilling: addr.is_default_billing,
    deliveryInstructions: addr.delivery_instructions || undefined,
  }));

  ResponseFormatter.success(res, addressesResponse, 'Addresses retrieved successfully');
};

const router = Router();
router.get(
  '/:userId/addresses',
  requireAuth,
  validationMiddleware(paramsSchema, 'params'),
  requireOwnerOrPermission('userId', 'users:read'),
  handler
);

export default router;
