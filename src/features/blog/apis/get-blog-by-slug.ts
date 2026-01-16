/**
 * GET /api/blogs/slug/:slug
 * Get single blog by slug (for frontend detail pages)
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { RequestWithUser } from '../../../interfaces';
import { ResponseFormatter, HttpException } from '../../../utils';
import { findBlogBySlug } from '../shared/queries';

const paramsSchema = z.object({
    slug: z.string().min(1).max(255),
});

const handler = async (req: RequestWithUser, res: Response) => {
    const { slug } = paramsSchema.parse(req.params);

    const blog = await findBlogBySlug(slug);

    if (!blog) {
        throw new HttpException(404, 'Blog not found');
    }

    // Only return public blogs for frontend
    if (blog.status !== 'public') {
        throw new HttpException(404, 'Blog not found');
    }

    // Calculate read time based on content length (avg 200 words per minute)
    const wordCount = blog.content?.split(/\s+/).length || 0;
    const readTime = Math.max(1, Math.ceil(wordCount / 200));

    // Transform for Frontend
    const responseData = {
        ...blog,
        visibility: blog.status.charAt(0).toUpperCase() + blog.status.slice(1),
        readTime: `${readTime} min read`,
        // Format date for display
        formattedDate: blog.published_at
            ? new Intl.DateTimeFormat('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            }).format(new Date(blog.published_at))
            : null,
    };

    ResponseFormatter.success(res, responseData, 'Blog retrieved successfully');
};

const router = Router();
router.get('/slug/:slug', handler);

export default router;
