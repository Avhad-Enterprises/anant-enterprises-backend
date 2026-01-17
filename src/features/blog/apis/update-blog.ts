/**
 * PUT /api/blogs/:id
 * Update blog details
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth, requirePermission, validationMiddleware } from '../../../middlewares';
import { ResponseFormatter, uuidSchema, HttpException } from '../../../utils';
import { updateBlog, findBlogById } from '../shared/queries';

const paramsSchema = z.object({
    id: uuidSchema,
});

const updateBlogSchema = z.object({
    title: z.string().min(1).optional(),
    quote: z.string().optional(),
    description: z.string().optional(),
    content: z.string().optional(),
    visibility: z.enum(['Public', 'Private', 'Draft']).transform(val => val.toLowerCase() as 'public' | 'private' | 'draft').optional(),
    category: z.string().optional(),
    tags: z.array(z.string()).optional(),
    author: z.string().optional(),
    metaTitle: z.string().optional(),
    metaDescription: z.string().optional(),
    metaURL: z.string().optional(),

    mainImagePC: z.any().optional(),
    mainImageMobile: z.any().optional(),

    adminComment: z.string().optional(),

    // Subsections Update Logic
    subsections: z.array(z.object({
        id: z.string().optional(), // If present -> update, else -> create
        title: z.string(),
        description: z.string(),
        image: z.any().optional(),
    })).optional(),
});

const handler = async (req: RequestWithUser, res: Response) => {
    const { id } = paramsSchema.parse(req.params);
    const data = req.body;

    const existingBlog = await findBlogById(id);
    if (!existingBlog) {
        throw new HttpException(404, 'Blog not found');
    }

    // 1. Prepare Blog Updates
    const blogUpdates: any = {};
    if (data.title) blogUpdates.title = data.title;
    if (data.quote !== undefined) blogUpdates.quote = data.quote;
    if (data.description) blogUpdates.description = data.description;
    if (data.content) blogUpdates.content = data.content;
    if (data.metaURL) blogUpdates.slug = data.metaURL;
    if (data.visibility) blogUpdates.status = data.visibility;
    if (data.category) blogUpdates.category = data.category;
    if (data.tags) blogUpdates.tags = data.tags;
    if (data.author) blogUpdates.author = data.author;
    if (data.metaTitle) blogUpdates.meta_title = data.metaTitle;
    if (data.metaDescription) blogUpdates.meta_description = data.metaDescription;
    if (data.mainImagePC) blogUpdates.main_image_pc_url = typeof data.mainImagePC === 'string' ? data.mainImagePC : undefined;
    if (data.mainImageMobile) blogUpdates.main_image_mobile_url = typeof data.mainImageMobile === 'string' ? data.mainImageMobile : undefined;
    if (data.adminComment) blogUpdates.admin_comment = data.adminComment;

    // Handle published_at logic for visibility transitions
    // Only set published_at when transitioning to 'public' or 'private' AND it's not already set
    if (data.visibility) {
        const isPublishAction = data.visibility === 'public' || data.visibility === 'private';
        const wasNeverPublished = existingBlog.published_at === null;

        if (isPublishAction && wasNeverPublished) {
            // First-time publish - record the publish timestamp
            blogUpdates.published_at = new Date();
        }
        // If already published (published_at exists), keep the original date
        // If changing to draft, also keep the original date for audit trail
    }

    // 2. Prepare Subsections Updates
    let subsectionsUpdates = undefined;
    if (data.subsections) {
        const existingSubIds = existingBlog.subsections.map(s => s.id);
        const incomingIds = data.subsections.filter((s: any) => s.id).map((s: any) => s.id);

        // Identify Deleted
        const toDelete = existingSubIds.filter(id => !incomingIds.includes(id));

        // Identify Create & Update
        const toCreate: any[] = [];
        const toUpdate: any[] = [];

        data.subsections.forEach((sub: any, index: number) => {
            const subData = {
                title: sub.title,
                description: sub.description,
                image_url: typeof sub.image === 'string' ? sub.image : undefined,
                sort_order: index,
            };

            if (sub.id) {
                toUpdate.push({ id: sub.id, ...subData });
            } else {
                toCreate.push(subData);
            }
        });

        subsectionsUpdates = {
            create: toCreate,
            update: toUpdate,
            delete: toDelete,
        };
    }

    const result = await updateBlog(id, blogUpdates, subsectionsUpdates);

    ResponseFormatter.success(res, result, 'Blog updated successfully');
};

const router = Router();
router.put(
    '/:id',
    requireAuth,
    requirePermission('blogs:update'),
    validationMiddleware(updateBlogSchema),
    handler
);

export default router;
