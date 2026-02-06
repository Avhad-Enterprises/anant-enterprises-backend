import { eq, and, or, sql, SQL, inArray, like, gt, lt, gte, lte, notLike, isNotNull, isNull } from 'drizzle-orm';
import { db } from '../../../database';
import {
    customerSegments,
    customerSegmentRules,
    type NewCustomerSegment,
    type CustomerSegmentRule,
    type NewCustomerSegmentRule
} from './customer-segments.schema';
import { users } from '../../user/shared/user.schema';
import { customerProfiles } from '../../customer/shared/customer-profiles.schema';

/**
 * Get all customer segments
 */
export const getCustomerSegments = async () => {
    return db
        .select()
        .from(customerSegments)
        .where(eq(customerSegments.is_deleted, false))
        .orderBy(customerSegments.created_at);
};

/**
 * Find segment by ID
 */
export const findSegmentById = async (id: string) => {
    const segment = await db
        .select()
        .from(customerSegments)
        .where(and(eq(customerSegments.id, id), eq(customerSegments.is_deleted, false)))
        .limit(1);

    return segment[0];
};

/**
 * Get rules for a segment
 */
export const getSegmentRules = async (segmentId: string) => {
    return db
        .select()
        .from(customerSegmentRules)
        .where(eq(customerSegmentRules.segment_id, segmentId));
};

/**
 * Create a new segment with rules
 */
export const createCustomerSegment = async (
    segmentData: NewCustomerSegment,
    rulesData: Omit<NewCustomerSegmentRule, 'segment_id'>[]
) => {
    return db.transaction(async (tx) => {
        let [segment] = await tx.insert(customerSegments).values(segmentData).returning();

        if (rulesData.length > 0) {
            const rulesToInsert = rulesData.map(rule => ({
                ...rule,
                segment_id: segment.id
            }));
            await tx.insert(customerSegmentRules).values(rulesToInsert);

            // Calculate and update estimated users for automated segments
            if (segment.type === 'automated') {
                const count = await getMatchingUsersCount(segment.match_type, rulesData);
                const [updated] = await tx
                    .update(customerSegments)
                    .set({
                        estimated_users: count,
                        last_refreshed_at: new Date()
                    })
                    .where(eq(customerSegments.id, segment.id))
                    .returning();
                segment = updated;
            }
        }

        return segment;
    });
};

/**
 * Update segment and its rules
 */
export const updateCustomerSegment = async (
    id: string,
    segmentData: Partial<NewCustomerSegment>,
    rulesData?: Omit<NewCustomerSegmentRule, 'segment_id'>[]
) => {
    return db.transaction(async (tx) => {
        let [segment] = await tx
            .update(customerSegments)
            .set({ ...segmentData, updated_at: new Date() })
            .where(eq(customerSegments.id, id))
            .returning();

        if (rulesData) {
            // Simple sync: delete old rules and insert new ones
            await tx.delete(customerSegmentRules).where(eq(customerSegmentRules.segment_id, id));

            if (rulesData.length > 0) {
                const rulesToInsert = rulesData.map(rule => ({
                    ...rule,
                    segment_id: id
                }));
                await tx.insert(customerSegmentRules).values(rulesToInsert);
            }

            // Calculate and update estimated users for automated segments
            // Use the updated segment's match_type (or existing if not changed)
            if (segment.type === 'automated') {
                const count = await getMatchingUsersCount(segment.match_type, rulesData);
                const [updated] = await tx
                    .update(customerSegments)
                    .set({
                        estimated_users: count,
                        last_refreshed_at: new Date()
                    })
                    .where(eq(customerSegments.id, id))
                    .returning();
                segment = updated;
            }
        }

        return segment;
    });
};

/**
 * Soft delete segment
 */
export const deleteCustomerSegment = async (id: string, userId: string) => {
    return db
        .update(customerSegments)
        .set({
            is_deleted: true,
            deleted_by: userId,
            deleted_at: new Date()
        })
        .where(eq(customerSegments.id, id))
        .returning();
};

/**
 * Execute segment rules to find matching users
 */
export const getMatchingUsers = async (
    matchType: 'all' | 'any',
    rules: CustomerSegmentRule[] | Omit<NewCustomerSegmentRule, 'segment_id'>[],
    limit: number = 50,
    offset: number = 0
) => {
    const conditions: SQL[] = [];

    for (const rule of rules) {
        const condition = buildCondition(rule.field, rule.condition, rule.value);
        if (condition) {
            conditions.push(condition);
        }
    }

    if (conditions.length === 0) {
        // If no rules, return all users (or empty depending on business logic)
        // For "Manual" type, we wouldn't call this with empty rules unless we want everyone.
        // Let's return empty if no rules provided for "Automated".
        return [];
    }

    const whereClause = matchType === 'all' ? and(...conditions) : or(...conditions);

    // We join users with customer_profiles to allow filtering on both profile and user data
    const matchingUsers = await db
        .select({
            id: users.id,
            first_name: users.first_name,
            last_name: users.last_name,
            email: users.email,
            tags: users.tags,
        })
        .from(users)
        .leftJoin(customerProfiles, eq(users.id, customerProfiles.user_id))
        .where(and(eq(users.is_deleted, false), whereClause))
        .limit(limit)
        .offset(offset);

    return matchingUsers;
};

/**
 * Get total count of matching users
 */
export const getMatchingUsersCount = async (
    matchType: 'all' | 'any',
    rules: CustomerSegmentRule[] | Omit<NewCustomerSegmentRule, 'segment_id'>[]
) => {
    const conditions: SQL[] = [];

    for (const rule of rules) {
        const condition = buildCondition(rule.field, rule.condition, rule.value);
        if (condition) {
            conditions.push(condition);
        }
    }

    if (conditions.length === 0) return 0;

    const whereClause = matchType === 'all' ? and(...conditions) : or(...conditions);

    const [result] = await db
        .select({
            count: sql<number>`count(${users.id})::int`,
        })
        .from(users)
        .leftJoin(customerProfiles, eq(users.id, customerProfiles.user_id))
        .where(and(eq(users.is_deleted, false), whereClause));

    return result?.count || 0;
};

/**
 * Execute segment rules to find matching users (PREVIEW Mode)
 * Supports nested groups (recursion) and returns count + sample users
 */
export const getMatchingUsersPreview = async (
    matchType: 'all' | 'any',
    rules: any[], // Accepts recursive structure
    limit: number = 10
) => {
    const whereClause = buildRecursiveWhere(rules, matchType);

    // If no valid rules, return appropriate empty/full set
    // For automated segments, usually empty rules means no users unless specific "All Users" logic exists
    // We'll return empty to be safe
    if (!whereClause) {
        return { count: 0, users: [] };
    }

    const baseQuery = db
        .select({
            id: users.id,
            first_name: users.first_name,
            last_name: users.last_name,
            email: users.email,
            tags: users.tags,
        })
        .from(users)
        .leftJoin(customerProfiles, eq(users.id, customerProfiles.user_id));

    // Get Count
    const countResult = await db
        .select({
            count: sql<number>`count(${users.id})::int`,
        })
        .from(users)
        .leftJoin(customerProfiles, eq(users.id, customerProfiles.user_id))
        .where(and(eq(users.is_deleted, false), whereClause));

    // Get Sample Users
    const sampleUsers = await baseQuery
        .where(and(eq(users.is_deleted, false), whereClause))
        .limit(limit);

    return {
        count: countResult[0]?.count || 0,
        users: sampleUsers
    };
};

/**
 * Recursive helper to build Drizzle conditions from nested rule data
 */
function buildRecursiveWhere(rules: any[], matchType: 'all' | 'any'): SQL | undefined {
    if (!rules || !Array.isArray(rules) || rules.length === 0) return undefined;

    const conditions: SQL[] = [];

    for (const rule of rules) {
        // Check if it's a group (nested rules)
        if (rule.rules && Array.isArray(rule.rules) && rule.rules.length > 0) {
            const groupMatchType = rule.matchType || 'all';
            const groupCondition = buildRecursiveWhere(rule.rules, groupMatchType);
            if (groupCondition) {
                conditions.push(groupCondition);
            }
        } else {
            // It's a standard rule
            // Support both 'condition' and 'operator' for frontend compatibility
            const operator = rule.operator || rule.condition;
            const condition = buildCondition(rule.field, operator, rule.value);
            if (condition) {
                conditions.push(condition);
            }
        }
    }

    if (conditions.length === 0) return undefined;

    return matchType === 'all' ? and(...conditions) : or(...conditions);
}

/**
 * Helper to build Drizzle conditions from rule data
 */
function buildCondition(field: string, condition: string, value: string): SQL | undefined {
    // Basic validation
    if (!field || !condition) return undefined;

    // Map field names to columns or SQL expressions
    let column: any;

    switch (field) {
        case 'first_name': column = users.first_name; break;
        case 'last_name': column = users.last_name; break;
        case 'email': column = users.email; break;
        case 'city': column = sql`(${users.metadata}->>'city')`; break;
        case 'account_status': column = customerProfiles.account_status; break;
        case 'tags':
            // For tags (array field), we convert to string for simple string matching rules
            // or we could use array operators in the future.
            column = sql`ARRAY_TO_STRING(${users.tags}, ',')`;
            break;
        case 'total_spent':
            // Placeholder: In a real system, this would join with order totals
            // For now, if we have customer_statistics table, we could use that.
            // Let's check if we can use customer_statistics.total_spent
            // Since we're not joining that table here and it might not be implemented,
            // we'll keep it as a placeholder but make it a valid numeric expression.
            column = sql`COALESCE((SELECT total_spent FROM customer_statistics WHERE user_id = ${users.id}), 0)`;
            break;
        default: return undefined;
    }

    if (!column) return undefined;

    // Handle numeric comparisons for total_spent
    if (field === 'total_spent') {
        const numValue = parseFloat(value);
        if (isNaN(numValue)) return undefined;

        switch (condition) {
            case 'equals':
            case '=': return eq(column, numValue);
            case 'gt':
            case '>': return gt(column, numValue);
            case 'lt':
            case '<': return lt(column, numValue);
            case 'gte':
            case '>=': return gte(column, numValue);
            case 'lte':
            case '<=': return lte(column, numValue);
            case 'not_equals':
            case '!=': return sql`${column} <> ${numValue}`;
            default: return undefined;
        }
    }

    // Standard string comparisons
    // Normalize operator/condition
    switch (condition) {
        case 'equals':
        case '=': return eq(column, value);

        case 'not_equals':
        case '!=': return sql`${column} <> ${value}`;

        case 'contains': return like(column, `%${value}%`);
        case 'not_contains': return notLike(column, `%${value}%`);

        case 'starts_with': return like(column, `${value}%`);
        case 'ends_with': return like(column, `%${value}`);

        case 'gt':
        case '>': return gt(column, value);

        case 'lt':
        case '<': return lt(column, value);

        case 'gte':
        case '>=': return gte(column, value);

        case 'lte':
        case '<=': return lte(column, value);

        case 'is_set': return isNotNull(column);
        case 'is_not_set': return isNull(column);

        case 'in': return inArray(column, value.split(',').map(v => v.trim()));

        default: return undefined;
    }
}
