/**
 * GET /api/blogs/:id
 * Get single blog by ID
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { RequestWithUser } from '../../../interfaces';
import { ResponseFormatter, uuidSchema, HttpException } from '../../../utils';
import { findBlogById } from '../shared/queries';

const paramsSchema = z.object({
    id: uuidSchema,
});

const handler = async (req: RequestWithUser, res: Response) => {
    const { id } = paramsSchema.parse(req.params);

    const blog = await findBlogById(id);

    if (!blog) {
        throw new HttpException(404, 'Blog not found');
    }

    // Transform for Frontend if needed (e.g. status -> visibility)
    // Frontend expects 'Public', Backend has 'public'
    const responseData = {
        ...blog,
        visibility: blog.status.charAt(0).toUpperCase() + blog.status.slice(1),
        // Map other fields if necessary
    };

    ResponseFormatter.success(res, responseData, 'Blog retrieved successfully');
};

const router = Router();
router.get('/:id', handler);

export default router;
