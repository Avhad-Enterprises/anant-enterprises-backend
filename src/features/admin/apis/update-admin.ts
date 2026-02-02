/**
 * PATCH /api/admins/:id
 * Update admin/staff user details
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth, requirePermission, validationMiddleware } from '../../../middlewares';
import { ResponseFormatter, shortTextSchema, emailSchema, uuidSchema, logger, HttpException } from '../../../utils';
import { db } from '../../../database';
import { users } from '../../user/shared/user.schema';
import { adminProfiles } from '../shared/admin-profiles.schema';
import { updateTagUsage } from '../../tags/services/tag-sync.service';

// Validation Schema
const updateAdminSchema = z.object({
    // User Fields
    first_name: shortTextSchema.optional(),
    middle_name: shortTextSchema.optional().nullable(),
    last_name: shortTextSchema.optional(),
    email: emailSchema.optional(),
    phone_number: z.string().optional().nullable(),
    secondary_email: z.string().email().optional().nullable(),
    secondary_phone_number: z.string().optional().nullable(),
    email_verified: z.boolean().optional(),
    secondary_email_verified: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
    display_name: z.string().max(100).optional().nullable(),
    date_of_birth: z.string().optional().nullable(),
    gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional().nullable(),
    preferred_language: z.string().optional(),
    languages: z.array(z.string()).optional(),
    profile_image_url: z.string().optional().nullable(),

    // Admin Profile Fields
    employee_id: z.string().max(50).optional().nullable(),
    department: z.string().max(100).optional().nullable(),
    job_title: z.string().max(100).optional().nullable(),
    is_active: z.boolean().optional(),
});

type UpdateAdminDto = z.infer<typeof updateAdminSchema>;

const paramsSchema = z.object({
    id: uuidSchema,
});

const handler = async (req: RequestWithUser, res: Response) => {
    const { id } = req.params as { id: string };
    const data: UpdateAdminDto = req.body;

    logger.info(`Updating admin ${id}`, data);

    // Store oldTags outside transaction for tag sync
    let oldTags: string[] = [];

    await db.transaction(async (tx) => {
        // Fetch existing user and profile
        const existingResult = await tx
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
        oldTags = existingUser.tags || [];

        // 1. Update User Table (Basic Info)
        const userUpdates: Record<string, unknown> = {};
        if (data.first_name) userUpdates.first_name = data.first_name;
        if (data.middle_name !== undefined) userUpdates.middle_name = data.middle_name;
        if (data.last_name) userUpdates.last_name = data.last_name;
        if (data.email) userUpdates.email = data.email;
        if (data.phone_number !== undefined) userUpdates.phone_number = data.phone_number;
        if (data.tags) userUpdates.tags = data.tags;
        if (data.display_name !== undefined) userUpdates.display_name = data.display_name || null;
        if (data.date_of_birth !== undefined) userUpdates.date_of_birth = data.date_of_birth || null;
        if (data.gender !== undefined) userUpdates.gender = data.gender || null;
        if (data.profile_image_url !== undefined) userUpdates.profile_image_url = data.profile_image_url;
        if (data.preferred_language !== undefined) userUpdates.preferred_language = data.preferred_language;
        if (data.languages !== undefined) userUpdates.languages = data.languages;
        if (data.secondary_email !== undefined) userUpdates.secondary_email = data.secondary_email;
        if (data.secondary_phone_number !== undefined) userUpdates.secondary_phone_number = data.secondary_phone_number;

        // Handle verification status for primary/secondary swap
        if (data.email_verified !== undefined) {
            userUpdates.email_verified = data.email_verified;
            if (data.email_verified) {
                userUpdates.email_verified_at = new Date();
            } else {
                userUpdates.email_verified_at = null;
            }
        }

        if (data.secondary_email_verified !== undefined) {
            userUpdates.secondary_email_verified = data.secondary_email_verified;
        }

        userUpdates.updated_at = new Date();

        if (Object.keys(userUpdates).length > 1) { // >1 because updated_at is always set
            await tx
                .update(users)
                .set(userUpdates)
                .where(eq(users.id, id));
        }

        // 2. Update Admin Profile
        const adminProfileUpdates: Record<string, unknown> = {};
        if (data.employee_id !== undefined) adminProfileUpdates.employee_id = data.employee_id;
        if (data.department !== undefined) adminProfileUpdates.department = data.department;
        if (data.job_title !== undefined) adminProfileUpdates.job_title = data.job_title;
        if (data.is_active !== undefined) adminProfileUpdates.is_active = data.is_active;

        adminProfileUpdates.updated_at = new Date();

        if (Object.keys(adminProfileUpdates).length > 1) {
            await tx
                .update(adminProfiles)
                .set(adminProfileUpdates)
                .where(eq(adminProfiles.user_id, id));
        }
    });

    // 3. Update tag usage counts (outside transaction)
    if (data.tags) {
        await updateTagUsage(oldTags, data.tags, 'admin');
    }

    logger.info(`Admin ${id} updated successfully`);
    ResponseFormatter.success(res, null, 'Admin updated successfully');
};

const router = Router();
router.patch(
    '/:id',
    requireAuth,
    requirePermission('admins:update'),
    validationMiddleware(paramsSchema, 'params'),
    validationMiddleware(updateAdminSchema, 'body'),
    handler
);

export default router;
