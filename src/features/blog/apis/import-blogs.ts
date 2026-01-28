/**
 * POST /api/blogs/import
 * Import blogs from CSV/JSON data
 * Admin only
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { ResponseFormatter, HttpException } from '../../../utils';
import { db } from '../../../database';
import { blogs } from '../shared/blog.schema';
import { requireAuth, requirePermission } from '../../../middlewares';
import { RequestWithUser } from '../../../interfaces';
import { logger } from '../../../utils/logging/logger';

// Validation schema for a single blog import
const blogImportSchema = z.object({
    title: z.string().min(1).max(255).trim(),
    slug: z.string().max(255).optional(),
    description: z.string().max(150).optional(),
    content: z.string().optional(),
    quote: z.string().max(500).optional(),
    category: z.string().max(100).optional(),
    tags: z.union([
        z.array(z.string()),
        z.string().transform(val => val.split(',').map(t => t.trim()).filter(t => t.length > 0))
    ]).optional(),
    author: z.string().max(255).optional(),
    status: z.enum(['public', 'private', 'draft'] as const).optional().default('draft'),
    meta_title: z.string().max(60).optional(),
    meta_description: z.string().max(160).optional(),
    admin_comment: z.string().optional(),
});

// Validation schema for the import request
const importBlogsSchema = z.object({
    data: z.array(blogImportSchema).min(1).max(1000), // Limit to 1000 blogs per import
    mode: z.enum(['create', 'update', 'upsert']).default('create'),
});

type ImportMode = 'create' | 'update' | 'upsert';
type ImportResult = {
    success: number;
    failed: number;
    skipped: number;
    errors: Array<{ row: number; title: string; error: string }>;
};

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
 * Import a single blog based on the mode
 */
async function importBlog(
    blogData: z.infer<typeof blogImportSchema>,
    mode: ImportMode,
    userId: string
): Promise<{ success: boolean; error?: string; skipped?: boolean }> {
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
                return { success: false, skipped: true };
            }

            // Ensure slug is unique
            slug = await ensureUniqueSlug(slug);

            // Create new blog
            await db.insert(blogs).values({
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
            });

            return { success: true };
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

            return { success: true };
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
            } else {
                // Ensure slug is unique
                slug = await ensureUniqueSlug(slug);

                // Create new blog
                await db.insert(blogs).values({
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
                });
            }

            return { success: true };
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
    // Log the incoming request for debugging
    logger.info('Import blogs request received', {
        bodyKeys: Object.keys(req.body),
        dataLength: req.body?.data?.length,
        mode: req.body?.mode,
        sampleData: req.body?.data?.slice(0, 2), // Log first 2 rows
    });

    // Validate request body
    const validation = importBlogsSchema.safeParse(req.body);
    if (!validation.success) {
        logger.error('Import validation failed', {
            errors: validation.error.issues,
            body: req.body,
        });
        throw new HttpException(400, 'Invalid request data', {
            details: validation.error.issues,
        });
    }

    const { data: blogsData, mode } = validation.data;
    const userId = req.userId;

    if (!userId) {
        throw new HttpException(401, 'User not authenticated');
    }

    const result: ImportResult = {
        success: 0,
        failed: 0,
        skipped: 0,
        errors: [],
    };

    // Process blogs sequentially to maintain order and handle errors properly
    for (let i = 0; i < blogsData.length; i++) {
        const blogData = blogsData[i];
        const rowNumber = i + 2; // +2 because row 1 is header and array is 0-indexed

        try {
            const importResult = await importBlog(blogData, mode, userId);

            if (importResult.success) {
                result.success++;
            } else if ((importResult as any).skipped) {
                result.skipped++;
            } else {
                result.failed++;
                result.errors.push({
                    row: rowNumber,
                    title: blogData.title,
                    error: importResult.error || 'Unknown error',
                });
            }
        } catch (error) {
            result.failed++;
            result.errors.push({
                row: rowNumber,
                title: blogData.title,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            logger.error('Error processing blog row', { rowNumber, error, blogData });
        }
    }

    logger.info('Import blogs completed', { result });

    return ResponseFormatter.success(
        res,
        result,
        `Import completed: ${result.success} succeeded, ${result.failed} failed`,
        200
    );
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
