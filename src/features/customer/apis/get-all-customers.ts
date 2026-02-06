import { Router, Response } from 'express';
import { z } from 'zod';
import { eq, count, desc, asc, and, or, arrayOverlaps, SQL, notInArray, sql, isNotNull, gte, lte } from 'drizzle-orm';
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
import { orders } from '../../orders/shared/orders.schema';
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
    orders_status: z.string().optional(),
    search: z.string().optional(),
    sort: z.string().optional(),
    from_date: z.string().optional(),
    to_date: z.string().optional(),
});

async function getAllCustomers(
    page: number,
    limit: number,
    type: string,
    status?: string,
    gender?: string,
    tags?: string,
    ordersStatus?: string,
    search?: string,
    sort?: string,
    fromDate?: string,
    toDate?: string
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
        const genders = gender.split(',').map(g => g.trim().toLowerCase()) as any[];

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

    // Order Status Filter
    if (ordersStatus) {
        const statuses = ordersStatus.split(',').map(s => s.trim());
        const statusConditions = [];

        // Base subquery for users with ANY orders (excluding deleted/drafts and NULL user_ids)
        const userOrdersSubquery = db
            .select({ userId: orders.user_id })
            .from(orders)
            .where(and(
                eq(orders.is_deleted, false),
                eq(orders.is_draft, false),
                isNotNull(orders.user_id)
            ))
            .groupBy(orders.user_id);

        if (statuses.includes('has-orders')) {
            statusConditions.push(inArray(users.id, userOrdersSubquery));
        }

        if (statuses.includes('no-orders')) {
             statusConditions.push(notInArray(users.id, userOrdersSubquery));
        }

        if (statuses.includes('high-value')) {
             // For high value (>10 orders)
             const highValueSubquery = db
                .select({ userId: orders.user_id })
                .from(orders)
                .where(and(
                    eq(orders.is_deleted, false),
                    eq(orders.is_draft, false),
                    isNotNull(orders.user_id)
                ))
                .groupBy(orders.user_id)
                .having(sql`count(*) > 10`);
             
             statusConditions.push(inArray(users.id, highValueSubquery));
        }

        if (statusConditions.length > 0) {
            conditions.push(or(...statusConditions) as SQL<unknown>);
        }
    }

    // Date Range Filter
    if (fromDate) {
        conditions.push(gte(users.created_at, new Date(fromDate)));
    }
    if (toDate) {
        // Adjust to end of day
        const endDay = new Date(toDate);
        endDay.setHours(23, 59, 59, 999);
        conditions.push(lte(users.created_at, endDay));
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

    // Order Count Subquery for Sorting
    const orderCountSq = db
        .select({
            userId: orders.user_id,
            totalOrders: count().as('total_orders')
        })
        .from(orders)
        .where(and(eq(orders.is_deleted, false), eq(orders.is_draft, false)))
        .groupBy(orders.user_id)
        .as('order_metrics');

    // 2. Fetch Data
    const allUsers = await db
        .select({
            user: users,
            customerProfile: customerProfiles,
            totalOrders: orderCountSq.totalOrders
            // businessProfile: businessCustomerProfiles, // Table dropped in Phase 2
        })
        .from(users)
        .leftJoin(customerProfiles, eq(users.id, customerProfiles.user_id))
        .leftJoin(orderCountSq, eq(users.id, orderCountSq.userId))
        // .leftJoin(businessCustomerProfiles, eq(users.id, businessCustomerProfiles.user_id)) // Table dropped in Phase 2
        .where(and(...conditions))
        .limit(limit)
        .offset(offset)
        .orderBy(
            // Dynamic Sorting
            (() => {
                switch (sort) {
                    case 'oldest': return asc(users.created_at);
                    case 'newest': return desc(users.created_at);
                    case 'name_asc': return asc(users.first_name);
                    case 'name_desc': return desc(users.first_name);
                    case 'orders_desc': return desc(orderCountSq.totalOrders);
                    default: return desc(users.created_at);
                }
            })()
        );

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

    // 2.2 Fetch Order Counts for these users
    let orderCountsMap: Record<string, number> = {};
    if (userIds.length > 0) {
        const orderCounts = await db
            .select({
                userId: orders.user_id,
                count: count()
            })
            .from(orders)
            .where(
                and(
                    inArray(orders.user_id, userIds),
                    eq(orders.is_deleted, false),
                    eq(orders.is_draft, false)
                )
            )
            .groupBy(orders.user_id);

        orderCounts.forEach(row => {
            if (row.userId) {
                orderCountsMap[row.userId] = Number(row.count);
            }
        });
    }

    // 3. Format Response
    const formattedUsers = allUsers.map(({ user, customerProfile, totalOrders }) => {
        const sanitized = sanitizeUsers([user])[0];
        return {
            ...sanitized,
            details: customerProfile || null,
            profileType: customerProfile ? 'individual' : 'none',
            addresses: addressesMap[user.id] || [],
            total_orders: Number(totalOrders || orderCountsMap[user.id] || 0), // Use joined count if available, fallback to map
            gender: user.gender // Explicitly ensuring gender is at top level
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
    const { page, limit, type, status, gender, tags, orders_status, search, sort, from_date, to_date } = paginationSchema.parse(req.query);

    const result = await getAllCustomers(page, limit, type, status, gender, tags, orders_status, search, sort, from_date, to_date);

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
