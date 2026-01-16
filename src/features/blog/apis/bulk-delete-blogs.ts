/**
 * POST /api/blogs/bulk-delete
 * Bulk delete blogs
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth, requirePermission, validationMiddleware } from '../../../middlewares';
import { ResponseFormatter } from '../../../utils';
import { bulkDeleteBlogs } from '../shared/queries';

const bulkDeleteSchema = z.object({
    ids: z.array(z.string().uuid()),
});

const handler = async (req: RequestWithUser, res: Response) => {
    const { ids } = req.body;

    await bulkDeleteBlogs(ids);

    ResponseFormatter.success(res, null, `${ids.length} blogs deleted successfully`);
};

const router = Router();
router.post(
    '/bulk-delete',
    requireAuth,
    requirePermission('blogs:delete'),
    validationMiddleware(bulkDeleteSchema),
    handler
);

export default router;
