/**
 * GET /api/admins
 * Get all admin/staff users with pagination, search, and filtering
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq, count, desc, and, SQL } from 'drizzle-orm';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth, requirePermission, validationMiddleware } from '../../../middlewares';
import { ResponseFormatter, logger } from '../../../utils';
import { db } from '../../../database';
import { users } from '../../user/shared/user.schema';
import { adminProfiles } from '../shared/admin-profiles.schema';
import { sanitizeUsers } from '../../user/shared/sanitizeUser';
import { buildAdminSearchConditions } from '../shared/search-utils';

// Default pagination values
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const querySchema = z.object({
    page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
    limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
    department: z.string().optional(),
    is_active: z.enum(['true', 'false', 'all']).default('all'),
    search: z.string().optional(),
    sort_by: z.enum(['created_at', 'name', 'department']).default('created_at'),
    sort_order: z.enum(['asc', 'desc']).default('desc'),
});

type GetAllAdminsQuery = z.infer<typeof querySchema>;

async function getAllAdmins(query: GetAllAdminsQuery) {
    const { page, limit, department, is_active, search, sort_by, sort_order } = query;
    const offset = (page - 1) * limit;

    // Base conditions
    const conditions = [
        eq(users.is_deleted, false),
        eq(adminProfiles.is_deleted, false),
    ];

    // Department filter
    if (department) {
        conditions.push(eq(adminProfiles.department, department));
    }

    // Active status filter
    if (is_active === 'true') {
        conditions.push(eq(adminProfiles.is_active, true));
    } else if (is_active === 'false') {
        conditions.push(eq(adminProfiles.is_active, false));
    }

    // Fuzzy Search filter (name, email, employee_id, job_title)
    if (search && search.trim().length > 0) {
        const searchConditions = buildAdminSearchConditions(search);
        if (searchConditions) {
            conditions.push(searchConditions as SQL<unknown>);
        }
    }

    // Fetch total count
    const [totalResult] = await db
        .select({ count: count() })
        .from(users)
        .innerJoin(adminProfiles, eq(users.id, adminProfiles.user_id))
        .where(and(...conditions));

    const total = totalResult.count;

    // Determine sort column
    let sortColumn;
    if (sort_by === 'name') {
        sortColumn = users.first_name;
    } else if (sort_by === 'department') {
        sortColumn = adminProfiles.department;
    } else {
        sortColumn = adminProfiles.created_at;
    }

    // Fetch admins with pagination
    const adminsResult = await db
        .select({
            user: users,
            adminProfile: adminProfiles,
        })
        .from(users)
        .innerJoin(adminProfiles, eq(users.id, adminProfiles.user_id))
        .where(and(...conditions))
        .orderBy(sort_order === 'asc' ? sortColumn : desc(sortColumn))
        .limit(limit)
        .offset(offset);

    // Format response
    const admins = adminsResult.map(({ user, adminProfile }) => {
        const sanitizedUser = sanitizeUsers([user])[0];
        return {
            ...sanitizedUser,
            profile: adminProfile,
        };
    });

    return {
        data: admins,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
}

const handler = async (req: RequestWithUser, res: Response) => {
    const query = querySchema.parse(req.query);
    logger.info('GET /admins request received', { query });

    const result = await getAllAdmins(query);
    logger.info(`Found ${result.data.length} admins`);

    ResponseFormatter.success(res, result, 'Admins retrieved successfully');
};

const router = Router();
router.get(
    '/',
    requireAuth,
    requirePermission('admins:read'),
    validationMiddleware(querySchema, 'query'),
    handler
);

export default router;
