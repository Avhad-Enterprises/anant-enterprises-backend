/**
 * GET /api/users/customer/:id
 * Get rich customer details by ID (combines User + Customer/Business Profile + Addresses)
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth } from '../../../middlewares';
import { requirePermission } from '../../../middlewares';
import validationMiddleware from '../../../middlewares/validation.middleware';
import { ResponseFormatter, uuidSchema, HttpException, logger } from '../../../utils';
import { db } from '../../../database';
import { users } from '../shared/user.schema';
import { customerProfiles } from '../shared/customer-profiles.schema';
import { businessCustomerProfiles } from '../shared/business-profiles.schema';
import { userAddresses } from '../shared/addresses.schema';
import { sanitizeUser } from '../shared/sanitizeUser';

const paramsSchema = z.object({
    id: uuidSchema,
});

async function getCustomerById(id: string) {
    // 1. Fetch User + Profile
    const result = await db
        .select({
            user: users,
            customerProfile: customerProfiles,
            businessProfile: businessCustomerProfiles,
        })
        .from(users)
        .leftJoin(customerProfiles, eq(users.id, customerProfiles.user_id))
        .leftJoin(businessCustomerProfiles, eq(users.id, businessCustomerProfiles.user_id))
        .where(eq(users.id, id));

    if (!result.length) {
        throw new HttpException(404, 'Customer not found');
    }

    const { user, customerProfile, businessProfile } = result[0];

    // 2. Fetch Addresses
    const addresses = await db
        .select()
        .from(userAddresses)
        .where(eq(userAddresses.user_id, id));

    // 3. Construct Rich Response
    // Determine if it's a "customer" (individual) or "business"
    // Note: The frontend treats them slightly differently but mostly unifies them.
    // We'll return a unified "customer" object with a "details" field containing the specific profile.

    const sanitizedUser = sanitizeUser(user);

    return {
        ...sanitizedUser,
        details: customerProfile || businessProfile || null,
        addresses: addresses,
        type: user.user_type, // 'individual' or 'business'
        // Helper to distinguish profile type
        profileType: customerProfile ? 'individual' : businessProfile ? 'business' : 'none',
    };
}

const handler = async (req: RequestWithUser, res: Response) => {
    try {
        const { id } = req.params as { id: string };
        logger.info(`GET /customer/${id} request received`);
        const customer = await getCustomerById(id);
        logger.info(`Customer found: ${customer.id}`);

        ResponseFormatter.success(res, customer, 'Customer retrieved successfully');
    } catch (error) {
        logger.error('Error in get-client-by-id:', error);
        throw error;
    }
};

const router = Router();
router.get(
    '/customer/:id',
    requireAuth,
    validationMiddleware(paramsSchema, 'params'),
    requirePermission('users:read'),
    handler
);

export default router;
