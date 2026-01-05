/**
 * GET /api/users/:userId/addresses
 * Get user addresses
 * - Users can view their own addresses
 * - Users with users:read permission can view any user's addresses
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth, requireOwnerOrPermission, validationMiddleware } from '../../../middlewares';
import { ResponseFormatter, uuidSchema } from '../../../utils';
import { db } from '../../../database';
import { userAddresses } from '../shared/addresses.schema';

const paramsSchema = z.object({
    userId: uuidSchema,
});

interface AddressResponse {
    id: string; // UUID
    type: 'Home' | 'Office' | 'Other';
    name: string;
    phone: string;
    addressLine: string;
    city: string;
    state: string;
    pincode: string;
    isDefault: boolean;
}

// Map backend address_type enum to frontend type
const mapAddressType = (type: string): 'Home' | 'Office' | 'Other' => {
    // Backend: 'billing' | 'shipping' | 'both' | 'company'
    // Frontend expects: 'Home' | 'Office' | 'Other'

    // Simple mapping - can be customized based on business logic
    switch (type) {
        case 'shipping':
            return 'Home';
        case 'company':
            return 'Office';
        default:
            return 'Other';
    }
};

const handler = async (req: RequestWithUser, res: Response) => {
    const { userId } = req.params;

    // Fetch all non-deleted addresses for the user
    const addresses = await db
        .select()
        .from(userAddresses)
        .where(
            and(
                eq(userAddresses.user_id, userId),
                eq(userAddresses.is_deleted, false)
            )
        );

    // Map to frontend format
    const addressesResponse: AddressResponse[] = addresses.map((addr) => ({
        id: addr.id,
        type: mapAddressType(addr.address_type),
        name: addr.recipient_name,
        phone: addr.phone_number
            ? `${addr.phone_country_code || ''}${addr.phone_number}`.trim()
            : '',
        addressLine: [addr.address_line1, addr.address_line2].filter(Boolean).join(', '),
        city: addr.city,
        state: addr.state_province,
        pincode: addr.postal_code,
        isDefault: addr.is_default,
    }));

    ResponseFormatter.success(
        res,
        addressesResponse,
        'Addresses retrieved successfully'
    );
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
