/**
 * DELETE /api/admins/:id
 * Soft delete admin/staff user
 * - Prevents self-deletion
 * - Prevents deletion of last active superadmin
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth, requirePermission, validationMiddleware } from '../../../middlewares';
import { ResponseFormatter, uuidSchema, HttpException, logger } from '../../../utils';
import { db } from '../../../database';
import { users } from '../../user/shared/user.schema';
import { adminProfiles } from '../shared/admin-profiles.schema';
import { userCacheService } from '../../user/services/user-cache.service';
import { decrementTagUsage } from '../../tags/services/tag-sync.service';
import { userRoles } from '../../rbac/shared/user-roles.schema';
import { roles } from '../../rbac/shared/roles.schema';

const paramsSchema = z.object({
    id: uuidSchema,
});

async function deleteAdmin(id: string, deletedBy: string): Promise<{ email: string }> {
    // Prevent self-deletion
    if (id === deletedBy) {
        throw new HttpException(400, 'Cannot delete your own account');
    }

    // Fetch existing user and profile
    const existingResult = await db
        .select({
            user: users,
            adminProfile: adminProfiles,
        })
        .from(users)
        .innerJoin(adminProfiles, eq(users.id, adminProfiles.user_id))
        .where(eq(users.id, id));

    if (!existingResult.length) {
        throw new HttpException(404, 'Admin not found');
    }

    const { user: existingUser } = existingResult[0];

    // Check if user has superadmin role
    const userRolesList = await db
        .select({ role: roles })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.role_id, roles.id))
        .where(eq(userRoles.user_id, id));

    const isSuperAdmin = userRolesList.some(ur => ur.role.name === 'superadmin');

    // If deleting a superadmin, ensure there's at least one other active superadmin
    if (isSuperAdmin) {
        const superAdminRole = await db
            .select()
            .from(roles)
            .where(eq(roles.name, 'superadmin'))
            .limit(1);

        if (superAdminRole.length > 0) {
            const otherSuperAdmins = await db
                .select({
                    user: users,
                    adminProfile: adminProfiles,
                })
                .from(userRoles)
                .innerJoin(users, eq(userRoles.user_id, users.id))
                .innerJoin(adminProfiles, eq(users.id, adminProfiles.user_id))
                .where(
                    and(
                        eq(userRoles.role_id, superAdminRole[0].id),
                        eq(users.is_deleted, false),
                        eq(adminProfiles.is_deleted, false),
                        eq(adminProfiles.is_active, true)
                    )
                );

            // If only one active superadmin exists (the one being deleted), prevent deletion
            if (otherSuperAdmins.length <= 1) {
                throw new HttpException(
                    400,
                    'Cannot delete the last active superadmin. Assign another user first.'
                );
            }
        }
    }

    await db.transaction(async (tx) => {
        // Soft delete user
        await tx
            .update(users)
            .set({
                is_deleted: true,
                deleted_by: deletedBy,
                deleted_at: new Date(),
            })
            .where(eq(users.id, id));

        // Soft delete admin profile
        await tx
            .update(adminProfiles)
            .set({
                is_deleted: true,
            })
            .where(eq(adminProfiles.user_id, id));
    });

    // Decrement tag usage counts for admin tags
    const adminTags = existingUser.tags || [];
    if (adminTags.length > 0) {
        await decrementTagUsage(adminTags);
    }

    return { email: existingUser.email };
}

const handler = async (req: RequestWithUser, res: Response) => {
    const { id } = paramsSchema.parse(req.params);
    const userId = req.userId;

    if (!userId) {
        throw new HttpException(401, 'User authentication required');
    }

    logger.info(`Deleting admin ${id}`);

    const { email } = await deleteAdmin(id, userId);

    // Invalidate cache for deleted admin
    await userCacheService.invalidateUser(id, email);

    logger.info(`Admin ${id} deleted successfully`);
    ResponseFormatter.success(res, null, 'Admin deleted successfully');
};

const router = Router();
router.delete(
    '/:id',
    requireAuth,
    requirePermission('admins:delete'),
    validationMiddleware(paramsSchema, 'params'),
    handler
);

export default router;
