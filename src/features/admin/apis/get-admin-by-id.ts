/**
 * GET /api/admins/:id
 * Get admin/staff user details by ID
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth, requirePermission, validationMiddleware } from '../../../middlewares';
import { ResponseFormatter, uuidSchema, HttpException, logger } from '../../../utils';
import { db } from '../../../database';
import { users } from '../../user/shared/user.schema';
import { adminProfiles } from '../shared/admin-profiles.schema';
import { sanitizeUser } from '../../user/shared/sanitizeUser';

const paramsSchema = z.object({
    id: uuidSchema,
});

async function getAdminById(id: string) {
    // Fetch User + Admin Profile
    const result = await db
        .select({
            user: users,
            adminProfile: adminProfiles,
        })
        .from(users)
        .innerJoin(adminProfiles, eq(users.id, adminProfiles.user_id))
        .where(eq(users.id, id));

    if (!result.length) {
        throw new HttpException(404, 'Admin not found');
    }

    const { user, adminProfile } = result[0];

    // Check if user is deleted
    if (user.is_deleted || adminProfile.is_deleted) {
        throw new HttpException(404, 'Admin not found');
    }

    const sanitizedUser = sanitizeUser(user);

    return {
        ...sanitizedUser,
        profile: adminProfile,
    };
}

const handler = async (req: RequestWithUser, res: Response) => {
    const { id } = req.params as { id: string };
    logger.info(`GET /admins/${id} request received`);

    const admin = await getAdminById(id);
    logger.info(`Admin found: ${admin.id}`);

    ResponseFormatter.success(res, admin, 'Admin retrieved successfully');
};

const router = Router();
router.get(
    '/:id',
    requireAuth,
    requirePermission('admins:read'),
    validationMiddleware(paramsSchema, 'params'),
    handler
);

export default router;
