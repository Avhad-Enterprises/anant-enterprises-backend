/**
 * GET /api/users/customers (or /api/customers)
 * Get all customers with pagination, search, and filtering
 * Returns richer data than simple /users
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq, count, desc, and, sql } from 'drizzle-orm';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth } from '../../../middlewares';
import { requirePermission } from '../../../middlewares';
import { ResponseFormatter } from '../../../utils';
import { db } from '../../../database';
import { users } from '../shared/user.schema';
import { customerProfiles } from '../shared/customer-profiles.schema';
import { businessCustomerProfiles } from '../shared/business-profiles.schema';
import { sanitizeUsers } from '../shared/sanitizeUser';
import { userAddresses } from '../shared/addresses.schema';
import { inArray } from 'drizzle-orm';

// Default pagination values
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const paginationSchema = z.object({
    page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
    limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
    type: z.enum(['individual', 'business', 'all']).default('all'),
    status: z.string().optional(),
    search: z.string().optional(),
});

async function getAllCustomers(
    page: number,
    limit: number,
    type: string,
    status?: string,
    search?: string
) {
    const offset = (page - 1) * limit;

    // Base conditions (not deleted)
    const conditions = [eq(users.is_deleted, false)];

    // Type Filter
    if (type !== 'all') {
        conditions.push(eq(users.user_type, type as 'individual' | 'business'));
    }

    // Search Filter
    if (search) {
        const searchTerm = `%${search}%`;
        conditions.push(
            sql`(${users.name} ILIKE ${searchTerm} OR ${users.email} ILIKE ${searchTerm} OR ${users.phone_number} ILIKE ${searchTerm} OR ${users.display_name} ILIKE ${searchTerm})`
        );
    }

    // Exclude users with admin/superadmin roles
    // Subquery to find user IDs that have admin-like roles
    conditions.push(
        sql`${users.id} NOT IN (
            SELECT ur.user_id FROM user_roles ur
            INNER JOIN roles r ON ur.role_id = r.id
            WHERE r.name IN ('admin', 'superadmin')
        )`
    );

    // Status Filter
    if (status) {
        if (status === 'active') {
            conditions.push(
                sql`(${customerProfiles.account_status} = 'active' OR ${businessCustomerProfiles.account_status} = 'active')`
            );
        } else if (status === 'inactive' || status === 'closed') {
            conditions.push(
                sql`(${customerProfiles.account_status} = 'closed' OR ${businessCustomerProfiles.account_status} = 'closed')`
            );
        } else if (status === 'blocked' || status === 'suspended') {
            conditions.push(
                sql`(${customerProfiles.account_status} = 'suspended' OR ${businessCustomerProfiles.account_status} = 'suspended')`
            );
        }
    }

    // 1. Get Total Count
    // Join is needed for status filters
    const query = db
        .select({ total: count() })
        .from(users)
        .leftJoin(customerProfiles, eq(users.id, customerProfiles.user_id))
        .leftJoin(businessCustomerProfiles, eq(users.id, businessCustomerProfiles.user_id))
        .where(and(...conditions));

    const [countResult] = await query;
    const total = countResult?.total ?? 0;

    // 2. Fetch Data
    const allUsers = await db
        .select({
            user: users,
            customerProfile: customerProfiles,
            businessProfile: businessCustomerProfiles,
        })
        .from(users)
        .leftJoin(customerProfiles, eq(users.id, customerProfiles.user_id))
        .leftJoin(businessCustomerProfiles, eq(users.id, businessCustomerProfiles.user_id))
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
    const formattedUsers = allUsers.map(({ user, customerProfile, businessProfile }) => {
        const sanitized = sanitizeUsers([user])[0];
        return {
            ...sanitized,
            details: customerProfile || businessProfile || null,
            profileType: customerProfile ? 'individual' : businessProfile ? 'business' : 'none',
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
    const { page, limit, type, status, search } = paginationSchema.parse(req.query);

    const result = await getAllCustomers(page, limit, type, status, search);

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
