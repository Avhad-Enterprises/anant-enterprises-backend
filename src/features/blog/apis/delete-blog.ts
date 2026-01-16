/**
 * DELETE /api/blogs/:id
 * Delete blog
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth, requirePermission } from '../../../middlewares';
import { ResponseFormatter, uuidSchema, HttpException } from '../../../utils';
import { deleteBlog, findBlogById } from '../shared/queries';

const paramsSchema = z.object({
    id: uuidSchema,
});

const handler = async (req: RequestWithUser, res: Response) => {
    const { id } = paramsSchema.parse(req.params);

    const blog = await findBlogById(id);
    if (!blog) {
        throw new HttpException(404, 'Blog not found');
    }

    await deleteBlog(id);

    ResponseFormatter.success(res, null, 'Blog deleted successfully');
};

const router = Router();
router.delete('/:id', requireAuth, requirePermission('blogs:delete'), handler);

export default router;
