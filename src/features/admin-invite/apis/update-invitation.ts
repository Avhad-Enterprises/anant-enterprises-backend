/**
 * PUT /api/admin/invitations/:id
 * Update invitation details (Super Admin only)
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth } from '../../../middlewares';
import { requirePermission } from '../../../middlewares';
import { validationMiddleware } from '../../../middlewares';
import {
    ResponseFormatter,
    HttpException,
    shortTextSchema,
    emailSchema,
    uuidSchema,
} from '../../../utils';
import { logger } from '../../../utils';

import { updateInvitation, findInvitationById, findInvitationByEmail } from '../shared/queries';
import { findUserByEmail } from '../../user';
import { IInvitation } from '../shared/interface';

const schema = z.object({
    first_name: shortTextSchema,
    last_name: shortTextSchema,
    email: emailSchema,
    assigned_role_id: uuidSchema,
});

type UpdateInvitationDto = z.infer<typeof schema>;

async function handleUpdateInvitation(
    id: number,
    data: UpdateInvitationDto
): Promise<IInvitation> {
    // Check if invitation exists
    const invitation = await findInvitationById(id);
    if (!invitation) {
        throw new HttpException(404, 'Invitation not found');
    }

    // Allow editing all invitations for superadmin (removed pending check)
    // if (invitation.status !== 'pending') {
    //   throw new HttpException(400, 'Only pending invitations can be edited');
    // }

    // If email is changing, check for conflicts
    if (data.email !== invitation.email) {
        // Check if user already exists
        const existingUser = await findUserByEmail(data.email);
        if (existingUser) {
            throw new HttpException(409, 'A user with this email already exists');
        }

        // Check for existing pending invitation (excluding this one)
        const existingInvitation = await findInvitationByEmail(data.email);
        if (existingInvitation && existingInvitation.id !== id && existingInvitation.status === 'pending') {
            throw new HttpException(409, 'An active invitation already exists for this email');
        }
    }

    // Update invitation
    const updatedInvitation = await updateInvitation(id, data);

    if (!updatedInvitation) {
        throw new HttpException(500, 'Failed to update invitation');
    }

    logger.info('Invitation updated successfully', {
        invitationId: id,
        previousEmail: invitation.email,
        newEmail: data.email,
    });

    return updatedInvitation;
}

const handler = async (req: RequestWithUser, res: Response): Promise<void> => {
    const { id } = req.params;
    const updateData: UpdateInvitationDto = req.body;

    if (!id || isNaN(Number(id))) {
        throw new HttpException(400, 'Invalid invitation ID');
    }

    const invitation = await handleUpdateInvitation(Number(id), updateData);

    ResponseFormatter.success(res, invitation, 'Invitation updated successfully');
};

const router = Router();
router.put(
    '/update/:id',
    requireAuth,
    requirePermission('admin:invitations'), // Ensure permission is checked
    validationMiddleware(schema),
    handler
);

export default router;
