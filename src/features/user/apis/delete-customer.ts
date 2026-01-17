/**
 * DELETE /api/users/customer/:id
 * Soft delete customer (Admin only)
 * - Prevents self-deletion
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth } from '../../../middlewares';
import { requirePermission } from '../../../middlewares';
import validationMiddleware from '../../../middlewares/validation.middleware';
import { ResponseFormatter, uuidSchema } from '../../../utils';
import { HttpException } from '../../../utils';
import { db } from '../../../database';
import { users } from '../shared/user.schema';
import { findUserById } from '../shared/queries';
import { userCacheService } from '../services/user-cache.service';
import { decrementTagUsage } from '../../tags/services/tag-sync.service';

const paramsSchema = z.object({
    id: uuidSchema,
});

async function deleteCustomer(id: string, deletedBy: string): Promise<{ email: string }> {
    // Prevent self-deletion
    if (id === deletedBy) {
        throw new HttpException(400, 'Cannot delete your own account');
    }

    const existingUser = await findUserById(id);
    if (!existingUser) {
        throw new HttpException(404, 'Customer not found');
    }

    await db
        .update(users)
        .set({
            is_deleted: true,
            deleted_by: deletedBy,
            deleted_at: new Date(),
        })
        .where(eq(users.id, id));

    // Decrement tag usage counts for customer tags
    const customerTags = existingUser.tags || [];
    if (customerTags.length > 0) {
        await decrementTagUsage(customerTags);
    }

    return { email: existingUser.email };
}

const handler = async (req: RequestWithUser, res: Response) => {
    const { id } = paramsSchema.parse(req.params);
    const userId = req.userId;
    if (!userId) {
        throw new HttpException(401, 'User authentication required');
    }

    const { email } = await deleteCustomer(id, userId);

    // Invalidate cache for deleted customer
    await userCacheService.invalidateUser(id, email);

    ResponseFormatter.success(res, null, 'Customer deleted successfully');
};

const router = Router();
router.delete(
    '/customer/:id',
    requireAuth,
    requirePermission('users:delete'),
    validationMiddleware(paramsSchema, 'params'),
    handler
);

export default router;
