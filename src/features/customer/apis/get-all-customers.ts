import { Router, Response } from 'express';
import { z } from 'zod';
import { eq, count, desc, and, or, arrayOverlaps, SQL, notInArray } from 'drizzle-orm';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth } from '../../../middlewares';
import { requirePermission } from '../../../middlewares';
import { ResponseFormatter } from '../../../utils';
import { db } from '../../../database';
import { users } from '../../user/shared/user.schema';
import { customerProfiles } from '../shared/customer-profiles.schema';
// import { businessCustomerProfiles } from '../../user/shared/business-profiles.schema'; // Table dropped in Phase 2
import { sanitizeUsers } from '../../user/shared/sanitizeUser';
import { userAddresses } from '../../address/shared/addresses.schema';
import { inArray } from 'drizzle-orm';
import { userRoles } from '../../rbac/shared/user-roles.schema';
import { roles } from '../../rbac/shared/roles.schema';
import { buildCustomerSearchConditions } from '../shared/search-utils';

// Default pagination values
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const paginationSchema = z.object({
    page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
    limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
    type: z.enum(['individual', 'business', 'all']).default('all'),
    status: z.string().optional(),
    gender: z.string().optional(),
    tags: z.string().optional(),
    search: z.string().optional(),
});

async function getAllCustomers(
    page: number,
    limit: number,
    type: string,
    status?: string,
    gender?: string,
    tags?: string,
    search?: string
) {
    const offset = (page - 1) * limit;

    // Base conditions (not deleted)
    const conditions = [eq(users.is_deleted, false)];

    // Type Filter - Now based on profile existence, not user_type
    // 'individual' = has customer profile only
    // 'business' = has business profile
    // 'all' = any customer (has either profile)
    // Note: Filtering by profile will be done via JOIN, not WHERE clause here

    // Fuzzy Search Filter (NEW - using pg_trgm similarity)
    if (search && search.trim().length > 0) {
        const searchConditions = buildCustomerSearchConditions(search);
        if (searchConditions) {
            conditions.push(searchConditions as SQL<unknown>);
        }
    }

    // Exclude users with admin/superadmin roles using Drizzle subquery
    const adminUserIdsSubquery = db
        .select({ userId: userRoles.user_id })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.role_id, roles.id))
        .where(inArray(roles.name, ['admin', 'superadmin']));

    conditions.push(
        notInArray(users.id, adminUserIdsSubquery)
    );

    // Status Filter - only individual customer profiles supported now (business dropped Phase 2)
    if (status) {
        const statuses = status.split(',').map(s => s.trim().toLowerCase());
        const statusConditions = [];

        if (statuses.includes('active')) {
            statusConditions.push(
                eq(customerProfiles.account_status, 'active')
            );
        }
        if (statuses.includes('inactive')) {
            statusConditions.push(
                eq(customerProfiles.account_status, 'inactive')
            );
        }
        if (statuses.includes('blocked') || statuses.includes('banned')) {
            statusConditions.push(
                eq(customerProfiles.account_status, 'banned')
            );
        }

        if (statusConditions.length > 0) {
            conditions.push(or(...statusConditions) as SQL<unknown>);
        }
    }

    // Gender Filter
    if (gender) {
        const genders = gender.split(',').map(g => {
            const val = g.trim().toLowerCase();
            return val === 'prefer not to say' ? 'prefer_not_to_say' : val;
        }) as any[];

        if (genders.length > 0) {
            conditions.push(inArray(users.gender, genders));
        }
    }

    // Tags Filter
    if (tags) {
        const tagList = tags.split(',').map(t => t.trim());
        if (tagList.length > 0) {
            conditions.push(arrayOverlaps(users.tags, tagList));
        }
    }

    // 1. Get Total Count
    // Join is needed for status filters
    const query = db
        .select({ total: count() })
        .from(users)
        .leftJoin(customerProfiles, eq(users.id, customerProfiles.user_id))
        // .leftJoin(businessCustomerProfiles, eq(users.id, businessCustomerProfiles.user_id)) // Table dropped in Phase 2
        .where(and(...conditions));

    const [countResult] = await query;
    const total = countResult?.total ?? 0;

    // 2. Fetch Data
    const allUsers = await db
        .select({
            user: users,
            customerProfile: customerProfiles,
            // businessProfile: businessCustomerProfiles, // Table dropped in Phase 2
        })
        .from(users)
        .leftJoin(customerProfiles, eq(users.id, customerProfiles.user_id))
        // .leftJoin(businessCustomerProfiles, eq(users.id, businessCustomerProfiles.user_id)) // Table dropped in Phase 2
        .where(and(...conditions))
        .limit(limit)
        .offset(offset)
        .orderBy(desc(users.created_at));

    // 2.1 Fetch Addresses for these users
    const userIds = allUsers.map(u => u.user.id);
    let addressesMap: Record<string, any[]> = {};

    if (userIds.length > 0) {
        const addressesList = await db
            .select()
            .from(userAddresses)
            .where(inArray(userAddresses.user_id, userIds));

        addressesList.forEach(addr => {
            if (!addressesMap[addr.user_id]) {
                addressesMap[addr.user_id] = [];
            }
            addressesMap[addr.user_id].push(addr);
        });
    }

    // 3. Format Response
    const formattedUsers = allUsers.map(({ user, customerProfile }) => {
        const sanitized = sanitizeUsers([user])[0];
        return {
            ...sanitized,
            details: customerProfile || null,
            profileType: customerProfile ? 'individual' : 'none',
            addresses: addressesMap[user.id] || [],
            gender: user.gender // Explicitly ensuring gender is at top level (already in sanitized but being explicit helps debug)
        };
    });

    return {
        users: formattedUsers,
        total,
        page,
        limit,
    };
}

const handler = async (req: RequestWithUser, res: Response) => {
    const { page, limit, type, status, gender, tags, search } = paginationSchema.parse(req.query);

    const result = await getAllCustomers(page, limit, type, status, gender, tags, search);

    ResponseFormatter.paginated(
        res,
        result.users,
        { page: result.page, limit: result.limit, total: result.total },
        'Customers retrieved successfully'
    );
};

const router = Router();
router.get(
    '/customers',
    requireAuth,
    requirePermission('users:read'),
    handler
);

export default router;
