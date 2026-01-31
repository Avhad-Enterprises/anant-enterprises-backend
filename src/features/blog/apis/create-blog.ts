/**
 * POST /api/blogs
 * Create a new blog post
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth, requirePermission, validationMiddleware } from '../../../middlewares';
import { ResponseFormatter } from '../../../utils';
import { createBlog } from '../shared/queries';
import { syncTags } from '../../tags';

// Validation Schema
const createBlogSchema = z.object({
    title: z.string().min(1, 'Title is required'),
    quote: z.string().optional(),
    description: z.string().min(1, 'Description is required'),
    content: z.string().min(1, 'Content is required').refine(val => {
        // const cleaned = val.replace(/<[^>]*>/g, '').trim();
        // Check if stripping tags leaves nothing, BUT also handle images/embeds?
        // If content has ONLY tags like <p><br></p>, it's empty.
        // If it has <img ...>, it might be valid? Use simple check for now matching frontend.
        return val.trim() !== '' && val !== '<p><br></p>';
    }, 'Content cannot be empty'),

    // Status mapping: Frontend sends 'Public'/'Draft', Backend expects lowercase
    visibility: z.enum(['Public', 'Private', 'Draft']).transform(val => val.toLowerCase() as 'public' | 'private' | 'draft'),

    category: z.string().optional(),
    tags: z.array(z.string()).default([]),
    author: z.string().optional(),

    // SEO
    metaTitle: z.string().optional(),
    metaDescription: z.string().optional(),
    metaURL: z.string().optional(), // Maps to slug

    // Media
    mainImagePC: z.any().optional(), // Should be string URL in final payload
    mainImageMobile: z.any().optional(),

    // Admin
    adminComment: z.string().optional(),

    // Subsections
    subsections: z.array(z.object({
        title: z.string(),
        description: z.string(),
        image: z.any().optional(), // URL
    })).default([]),
});

const handler = async (req: RequestWithUser, res: Response) => {
    const userId = req.userId;
    const data = req.body;

    // Transform Frontend Data to Backend Schema
    const blogData = {
        title: data.title,
        quote: data.quote,
        description: data.description,
        content: data.content,
        slug: data.metaURL || data.title.toLowerCase().replace(/ /g, '-'), // Fallback slug

        status: data.visibility, // Already transformed by Zod
        category: data.category,
        tags: data.tags,
        author: data.author,

        meta_title: data.metaTitle,
        meta_description: data.metaDescription,

        main_image_pc_url: typeof data.mainImagePC === 'string' ? data.mainImagePC : undefined,
        main_image_mobile_url: typeof data.mainImageMobile === 'string' ? data.mainImageMobile : undefined,

        admin_comment: data.adminComment,

        // Set published_at when creating with public status
        published_at: data.visibility === 'public' ? new Date() : null,

        created_by: userId,
    };

    const subsectionsData = data.subsections.map((sub: any, index: number) => ({
        title: sub.title,
        description: sub.description,
        image_url: typeof sub.image === 'string' ? sub.image : undefined,
        sort_order: index,
    }));

    console.log('[CreateBlog] Received content:', data.content);
    console.log('[CreateBlog] BlogData content:', blogData.content);

    const newBlog = await createBlog(blogData, subsectionsData);

    console.log('[CreateBlog] Saved blog content:', newBlog.content);

    // Sync tags
    if (data.tags && data.tags.length > 0) {
        try {
            await syncTags(data.tags, 'blogs');
        } catch (error) {
            console.error('[CreateBlog] Failed to sync tags:', error);
            // Don't fail the request if tag sync fails
        }
    }

    ResponseFormatter.success(res, newBlog, 'Blog created successfully');
};

const router = Router();
router.post(
    '/',
    requireAuth,
    requirePermission('blogs:create'),
    validationMiddleware(createBlogSchema),
    handler
);

export default router;
