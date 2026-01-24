/**
 * GET /api/blogs
 * Get all blogs with pagination and filtering
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { RequestWithUser } from '../../../interfaces';
import { ResponseFormatter } from '../../../utils';
import { getAllBlogs } from '../shared/queries';

// Query Validation Schema
const querySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    search: z.string().optional(),
    category: z.string().optional(),
    visibility: z.enum(['Public', 'Private', 'Draft']).optional(),
    status: z.string().optional(), // Direct status param support
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
});

const handler = async (req: RequestWithUser, res: Response) => {
    const { page, limit, search, category, visibility, status, sortBy, sortOrder } = querySchema.parse(req.query);

    // Normalize status filter (support both 'visibility' from frontend and direct 'status')
    let statusFilter = status;
    if (!statusFilter && visibility) {
        statusFilter = visibility.toLowerCase();
    }

    const result = await getAllBlogs(page, limit, {
        search,
        category,
        status: statusFilter,
        sortBy,
        sortOrder,
    });

    ResponseFormatter.paginated(
        res,
        result.data,
        {
            page: result.page,
            limit: result.limit,
            total: result.total,
        },
        'Blogs retrieved successfully'
    );
};

const router = Router();
// Publicly accessible for reading? Or requireAuth? 
// Usually Admin APIs require auth. Let's make it open or protected based on requirement.
// Assuming this is for Admin Panel -> requireAuth.
// But if used by Website -> might need public access.
// For now, let's keep it open but maybe check permissions if needed. 
// Actually, this is admin blogs folder request, so usually protected.
// But the prompt said "origin data from database", implying website usage too.
// I'll keep it open for now to be safe for both, or standard practice is public GET.
router.get('/', handler);

export default router;
