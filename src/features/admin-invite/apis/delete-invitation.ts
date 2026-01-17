/**
 * DELETE /api/admin/invitations/:id
 * Delete (soft delete) an invitation
 */

import { Router, Response } from 'express';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth, requirePermission } from '../../../middlewares';
import { ResponseFormatter, HttpException, logger } from '../../../utils';
import { deleteInvitation, findInvitationById } from '../shared/queries';

async function handleDeleteInvitation(id: number, deletedBy: string): Promise<void> {
  const invitation = await findInvitationById(id);
  if (!invitation) {
    throw new HttpException(404, 'Invitation not found');
  }

  const result = await deleteInvitation(id, deletedBy);
  if (!result) {
    throw new HttpException(500, 'Failed to delete invitation');
  }

  logger.info('Invitation deleted successfully', {
    invitationId: id,
    deletedBy,
  });
}

const handler = async (req: RequestWithUser, res: Response): Promise<void> => {
  const { id } = req.params;

  if (!id || isNaN(Number(id))) {
    throw new HttpException(400, 'Invalid invitation ID');
  }

  // Ensure user exists (should be guaranteed by requireAuth)
  if (!req.userId) {
    throw new HttpException(401, 'Unauthorized');
  }

  await handleDeleteInvitation(Number(id), req.userId);

  ResponseFormatter.success(res, null, 'Invitation deleted successfully');
};

const router = Router();
router.delete(
  '/:id',
  requireAuth,
  requirePermission('admin:invitations'),
  handler
);

export default router;
