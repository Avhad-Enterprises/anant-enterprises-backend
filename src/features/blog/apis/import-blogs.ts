/**
 * POST /api/blogs/import
 * Import blogs from CSV/JSON data
 * Admin only
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { ResponseFormatter, logger } from '../../../utils';
import { db } from '../../../database';
import { blogs } from '../shared/blog.schema';
import { requireAuth, requirePermission } from '../../../middlewares';
import { RequestWithUser } from '../../../interfaces';
import {
    createImportResult,
    recordSuccess,
    recordFailure,
    recordSkipped,
    formatImportSummary,
    caseInsensitiveEnum,
    arrayParser,
    type ImportMode
} from '../../../utils/import-export';

// Blog-specific validation schema
const blogImportSchema = z.object({
    title: z.string().min(1).max(255).trim(),
    slug: z.string().max(255).optional(),
    description: z.string().max(150).optional(),
    content: z.string().optional(),
    quote: z.string().max(500).optional(),
    category: z.string().max(100).optional(),
    tags: arrayParser().optional(),
    author: z.string().max(255).optional(),
    status: caseInsensitiveEnum(['public', 'private', 'draft']).default('draft'),
    meta_title: z.string().max(60).optional(),
    meta_description: z.string().max(160).optional(),
    admin_comment: z.string().optional(),
});

const importRequestSchema = z.object({
    data: z.array(blogImportSchema).min(1).max(1000),
    mode: z.enum(['create', 'update', 'upsert']).default('create'),
});

/**
 * Generate a unique slug from title
 */
function generateSlug(title: string): string {
    return title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single
        .slice(0, 255); // Limit to 255 characters
}

/**
 * Ensure slug is unique by appending number if needed
 */
async function ensureUniqueSlug(baseSlug: string, existingId?: string): Promise<string> {
    let slug = baseSlug;
    let counter = 1;

    while (true) {
        const existing = await db
            .select({ id: blogs.id })
            .from(blogs)
            .where(eq(blogs.slug, slug))
            .limit(1);

        // If no existing blog with this slug, or it's the same blog being updated
        if (existing.length === 0 || (existingId && existing[0].id === existingId)) {
            return slug;
        }

        // Try with counter
        slug = `${baseSlug}-${counter}`;
        counter++;
    }
}

/**
 * Process a single blog import record
 */
async function processBlogRecord(
    blogData: z.infer<typeof blogImportSchema>,
    mode: ImportMode,
    userId: string
): Promise<{ success: boolean; recordId?: string; error?: string }> {
    try {
        // Generate or validate slug
        let slug = blogData.slug?.trim() || generateSlug(blogData.title);

        // Normalize status to lowercase
        const status = blogData.status?.toLowerCase() as 'public' | 'private' | 'draft' || 'draft';

        // Prepare tags array
        const tags = blogData.tags || [];

        // Check if blog exists by slug
        const existing = await db
            .select()
            .from(blogs)
            .where(eq(blogs.slug, slug))
            .limit(1);

        const blogExists = existing.length > 0;

        if (mode === 'create') {
            if (blogExists) {
                return { success: false, error: 'Blog already exists' };
            }

            // Ensure slug is unique
            slug = await ensureUniqueSlug(slug);

            // Create new blog
            const [newBlog] = await db.insert(blogs).values({
                title: blogData.title,
                slug,
                description: blogData.description,
                content: blogData.content,
                quote: blogData.quote,
                category: blogData.category,
                tags: tags as any,
                author: blogData.author,
                status,
                meta_title: blogData.meta_title,
                meta_description: blogData.meta_description,
                admin_comment: blogData.admin_comment,
                created_by: userId,
            }).returning({ id: blogs.id });

            return { success: true, recordId: newBlog.id };
        }

        if (mode === 'update') {
            if (!blogExists) {
                return { success: false, error: `Blog with slug '${slug}' does not exist` };
            }

            // Update existing blog
            await db
                .update(blogs)
                .set({
                    title: blogData.title,
                    description: blogData.description,
                    content: blogData.content,
                    quote: blogData.quote,
                    category: blogData.category,
                    tags: tags as any,
                    author: blogData.author,
                    status,
                    meta_title: blogData.meta_title,
                    meta_description: blogData.meta_description,
                    admin_comment: blogData.admin_comment,
                    updated_at: new Date(),
                })
                .where(eq(blogs.slug, slug));

            return { success: true, recordId: existing[0].id };
        }

        if (mode === 'upsert') {
            if (blogExists) {
                // Update existing blog
                await db
                    .update(blogs)
                    .set({
                        title: blogData.title,
                        description: blogData.description,
                        content: blogData.content,
                        quote: blogData.quote,
                        category: blogData.category,
                        tags: tags as any,
                        author: blogData.author,
                        status,
                        meta_title: blogData.meta_title,
                        meta_description: blogData.meta_description,
                        admin_comment: blogData.admin_comment,
                        updated_at: new Date(),
                    })
                    .where(eq(blogs.slug, slug));
                    
                return { success: true, recordId: existing[0].id };
            } else {
                // Ensure slug is unique
                slug = await ensureUniqueSlug(slug);

                // Create new blog
                const [newBlog] = await db.insert(blogs).values({
                    title: blogData.title,
                    slug,
                    description: blogData.description,
                    content: blogData.content,
                    quote: blogData.quote,
                    category: blogData.category,
                    tags: tags as any,
                    author: blogData.author,
                    status,
                    meta_title: blogData.meta_title,
                    meta_description: blogData.meta_description,
                    admin_comment: blogData.admin_comment,
                    created_by: userId,
                }).returning({ id: blogs.id });
                
                return { success: true, recordId: newBlog.id };
            }
        }

        return { success: false, error: 'Invalid import mode' };
    } catch (error) {
        logger.error('Error importing blog', { error, blogData });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

const handler = async (req: RequestWithUser, res: Response) => {
    const validation = importRequestSchema.safeParse(req.body);
    if (!validation.success) {
        return ResponseFormatter.error(res, 'VALIDATION_ERROR', 'Invalid request data', 400, {
            details: validation.error.issues,
        });
    }

    const { data: blogsData, mode } = validation.data;
    const userId = req.userId;

    if (!userId) {
        return ResponseFormatter.error(res, 'UNAUTHORIZED', 'User not authenticated', 401);
    }

    const result = createImportResult();
    logger.info(`Importing ${blogsData.length} blogs in ${mode} mode`, { userId });

    // Process each blog
    for (let i = 0; i < blogsData.length; i++) {
        const blogData = blogsData[i];
        const rowNumber = i + 1;

        const importResult = await processBlogRecord(blogData, mode, userId);

        if (importResult.success) {
            recordSuccess(result, mode, importResult.recordId);
        } else {
            if (importResult.error === 'Blog already exists') {
                recordSkipped(result, rowNumber, 'Already exists');
            } else {
                recordFailure(result, rowNumber, importResult.error || 'Unknown error');
            }
        }
    }

    const statusCode = result.failed === 0 ? 200 : 207;
    return ResponseFormatter.success(res, result, formatImportSummary(result), statusCode);
};

const router = Router();

// POST /api/blogs/import
router.post(
    '/',
    requireAuth,
    requirePermission('blogs:create'),
    handler
);

export default router;
