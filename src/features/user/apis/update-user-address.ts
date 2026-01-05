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

const paramsSchema = z.object({
    userId: uuidSchema,
    id: uuidSchema,
});

const bodySchema = z.object({
    type: z.enum(['Home', 'Office', 'Other']).optional(),
    name: shortTextSchema.optional(),
    phone: shortTextSchema.optional(),
    addressLine: shortTextSchema.optional(),
    city: shortTextSchema.optional(),
    state: shortTextSchema.optional(),
    pincode: shortTextSchema.optional(),
    isDefault: z.boolean().optional(),
});

// Map frontend type to backend address_type enum
const mapToBackendType = (type: 'Home' | 'Office' | 'Other'): 'billing' | 'shipping' | 'both' | 'company' => {
    switch (type) {
        case 'Home':
            return 'shipping';
        case 'Office':
            return 'company';
        case 'Other':
            return 'both';
    }
};

const handler = async (req: RequestWithUser, res: Response) => {
    const { userId, id: addressId } = req.params;
    const { type, name, phone, addressLine, city, state, pincode, isDefault } = req.body;

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
    const updateData: any = {
        updated_at: new Date(),
    };

    if (type) {
        updateData.address_type = mapToBackendType(type);
    }
    if (name) {
        updateData.recipient_name = name;
    }
    if (phone) {
        const phoneMatch = phone.match(/^(\+\d{1,3})?\s*(.+)$/);
        updateData.phone_country_code = phoneMatch?.[1] || '';
        updateData.phone_number = phoneMatch?.[2]?.replace(/\s/g, '') || phone;
    }
    if (addressLine) {
        updateData.address_line1 = addressLine;
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

    // If setting as default, unset other defaults of the same type
    if (isDefault !== undefined) {
        updateData.is_default = isDefault;

        if (isDefault) {
            const addressType = updateData.address_type || existingAddress.address_type;
            await db
                .update(userAddresses)
                .set({ is_default: false })
                .where(
                    and(
                        eq(userAddresses.user_id, userId),
                        eq(userAddresses.address_type, addressType),
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
            type: type || (existingAddress.address_type === 'shipping' ? 'Home' : existingAddress.address_type === 'company' ? 'Office' : 'Other'),
            name: updatedAddress.recipient_name,
            phone: phone || `${existingAddress.phone_country_code || ''}${existingAddress.phone_number || ''}`.trim(),
            addressLine: updatedAddress.address_line1,
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
    requireOwnerOrPermission('userId', 'users:write'),
    handler
);

export default router;
