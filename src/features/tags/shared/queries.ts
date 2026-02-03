/**
 * Tag Queries
 *
 * Reusable database queries for tag operations.
 * Extracted from API handlers per architecture guidelines.
 */

import { eq, and, like, desc, asc, count, gt, inArray, sql } from 'drizzle-orm';
import { PgTransaction } from 'drizzle-orm/pg-core';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { db, schema } from '../../../database';
import { tags, Tag, NewTag } from './tags.schema';
import { TagType } from './interface';
import { buildTagSearchConditions } from './search-utils';

type Database = NodePgDatabase<typeof schema> | PgTransaction<any, typeof schema, any>;

/**
 * Find tag by ID (excluding deleted tags)
 */
export const findTagById = async (id: string, tx: Database = db): Promise<Tag | undefined> => {
    const [tag] = await tx
        .select()
        .from(tags)
        .where(and(
            eq(tags.id, id),
            eq(tags.is_deleted, false)
        ))
        .limit(1);

    return tag;
};

/**
 * Find tag by name (excluding deleted tags)
 */
export const findTagByName = async (name: string, tx: Database = db): Promise<Tag | undefined> => {
    const [tag] = await tx
        .select()
        .from(tags)
        .where(and(
            eq(tags.name, name.toLowerCase()),
            eq(tags.is_deleted, false)
        ))
        .limit(1);

    return tag;
};

/**
 * Check if tag name exists (excluding specific tag ID and deleted tags)
 */
export const isTagNameTaken = async (
    name: string,
    excludeId?: string,
    tx: Database = db
): Promise<boolean> => {
    const normalizedName = name.toLowerCase();
    const conditions = [
        eq(tags.name, normalizedName),
        eq(tags.is_deleted, false)
    ];

    const result = await tx
        .select({ id: tags.id })
        .from(tags)
        .where(and(...conditions))
        .limit(1);

    if (result.length === 0) return false;
    if (excludeId && result[0].id === excludeId) return false;

    return true;
};

/**
 * Get tags by type (excluding deleted tags)
 */
export const getTagsByType = async (type: TagType, tx: Database = db): Promise<Tag[]> => {
    return tx
        .select()
        .from(tags)
        .where(and(
            eq(tags.type, type),
            eq(tags.is_deleted, false)
        ))
        .orderBy(tags.name);
};

/**
 * Get tags by status (excluding deleted tags)
 */
export const getTagsByStatus = async (status: boolean, tx: Database = db): Promise<Tag[]> => {
    return tx
        .select()
        .from(tags)
        .where(and(
            eq(tags.status, status),
            eq(tags.is_deleted, false)
        ))
        .orderBy(tags.name);
};

/**
 * Get unused tags (tags with usage_count = 0)
 */
export const getUnusedTags = async (tx: Database = db): Promise<Tag[]> => {
    return tx
        .select()
        .from(tags)
        .where(and(
            eq(tags.usage_count, 0),
            eq(tags.is_deleted, false)
        ))
        .orderBy(tags.name);
};

/**
 * Get most used tags
 */
export const getMostUsedTags = async (limit: number = 10, tx: Database = db): Promise<Tag[]> => {
    return tx
        .select()
        .from(tags)
        .where(and(
            gt(tags.usage_count, 0),
            eq(tags.is_deleted, false)
        ))
        .orderBy(desc(tags.usage_count))
        .limit(limit);
};

/**
 * Create a new tag
 */
export const createTag = async (
    data: NewTag,
    tx: Database = db
): Promise<Tag> => {
    const [tag] = await tx
        .insert(tags)
        .values(data)
        .returning();

    return tag;
};

/**
 * Update tag by ID
 */
export const updateTagById = async (
    id: string,
    data: Partial<Omit<NewTag, 'id'>>,
    tx: Database = db
): Promise<Tag | undefined> => {
    const [tag] = await tx
        .update(tags)
        .set({
            ...data,
            updated_at: new Date(),
        })
        .where(eq(tags.id, id))
        .returning();

    return tag;
};

/**
 * Soft delete tag by ID
 */
export const softDeleteTag = async (
    id: string,
    deletedBy: string,
    tx: Database = db
): Promise<void> => {
    await tx
        .update(tags)
        .set({
            is_deleted: true,
            deleted_at: new Date(),
            deleted_by: deletedBy,
            updated_at: new Date(),
        })
        .where(eq(tags.id, id));
};

/**
 * Bulk soft delete tags by IDs
 */
export const bulkSoftDeleteTags = async (
    ids: string[],
    deletedBy: string,
    tx: Database = db
): Promise<number> => {
    const result = await tx
        .update(tags)
        .set({
            is_deleted: true,
            deleted_at: new Date(),
            deleted_by: deletedBy,
            updated_at: new Date(),
        })
        .where(and(
            inArray(tags.id, ids),
            eq(tags.is_deleted, false)
        ))
        .returning({ id: tags.id });

    return result.length;
};

/**
 * Increment tag usage count (direct database operation)
 */
export const incrementTagUsageCount = async (
    id: string,
    tx: Database = db
): Promise<void> => {
    await tx
        .update(tags)
        .set({
            usage_count: sql`${tags.usage_count} + 1`,
            updated_at: new Date(),
        })
        .where(eq(tags.id, id));
};

/**
 * Decrement tag usage count (direct database operation)
 */
export const decrementTagUsageCount = async (
    id: string,
    tx: Database = db
): Promise<void> => {
    await tx
        .update(tags)
        .set({
            usage_count: sql`GREATEST(${tags.usage_count} - 1, 0)`,
            updated_at: new Date(),
        })
        .where(eq(tags.id, id));
};

/**
 * Reset tag usage count to zero
 */
export const resetTagUsage = async (
    id: string,
    tx: Database = db
): Promise<void> => {
    await tx
        .update(tags)
        .set({
            usage_count: 0,
            updated_at: new Date(),
        })
        .where(eq(tags.id, id));
};

/**
 * Get tag statistics
 */
export const getTagStats = async (tx: Database = db) => {
    const [stats] = await tx
        .select({
            total: count(),
            active: sql<number>`count(*) filter (where ${tags.status} = true)`,
            inactive: sql<number>`count(*) filter (where ${tags.status} = false)`,
            used: sql<number>`count(*) filter (where ${tags.usage_count} > 0)`,
            unused: sql<number>`count(*) filter (where ${tags.usage_count} = 0)`,
            byType: sql<Record<string, number>>`jsonb_object_agg(${tags.type}, count(*))`,
        })
        .from(tags)
        .where(eq(tags.is_deleted, false));

    return stats;
};

/**
 * Search tags by name (excluding deleted tags)
 */
export const searchTagsByName = async (
    searchTerm: string,
    limit: number = 50,
    tx: Database = db
): Promise<Tag[]> => {
    return tx
        .select()
        .from(tags)
        .where(and(
            like(tags.name, `%${searchTerm}%`),
            eq(tags.is_deleted, false)
        ))
        .orderBy(tags.name)
        .limit(limit);
};

/**
 * Query tags with filters and pagination
 */
export interface TagFilters {
    types?: TagType[];
    statuses?: boolean[];
    search?: string;
    usageFilter?: 'used' | 'unused' | 'all';
    sort?: 'newest' | 'oldest' | 'name_asc' | 'name_desc' | 'usage_high' | 'usage_low' | 'updated_desc' | 'updated_asc' | 'type_asc' | 'type_desc' | 'status_asc' | 'status_desc';
    page?: number;
    limit?: number;
}

export interface TagQueryResult {
    tags: Tag[];
    total: number;
    page: number;
    limit: number;
}

export const queryTags = async (
    filters: TagFilters = {},
    tx: Database = db
): Promise<TagQueryResult> => {
    const {
        types,
        statuses,
        search,
        usageFilter = 'all',
        sort = 'newest',
        page = 1,
        limit = 10
    } = filters;

    const pageNum = Math.max(1, page);
    const limitNum = Math.max(1, limit);
    const offset = (pageNum - 1) * limitNum;

    // Build filter conditions
    const conditions = [eq(tags.is_deleted, false)];

    // Filter by type
    if (types && types.length > 0) {
        conditions.push(inArray(tags.type, types));
    }

    // Filter by status
    if (statuses && statuses.length > 0) {
        conditions.push(inArray(tags.status, statuses));
    }

    // Search by name (Fuzzy)
    if (search && search.trim().length > 0) {
        const searchConditions = buildTagSearchConditions(search);
        if (searchConditions) {
            conditions.push(searchConditions);
        }
    }

    // Filter by usage
    if (usageFilter === 'used') {
        conditions.push(gt(tags.usage_count, 0));
    } else if (usageFilter === 'unused') {
        conditions.push(eq(tags.usage_count, 0));
    }

    // Get total count
    const [totalResult] = await tx
        .select({ value: count() })
        .from(tags)
        .where(and(...conditions));

    const total = totalResult.value;

    // Determine sort order
    let orderBy: any[] = [desc(tags.created_at)];
    switch (sort) {
        case 'oldest':
            orderBy = [asc(tags.created_at)];
            break;
        case 'name_asc':
            orderBy = [asc(tags.name)];
            break;
        case 'name_desc':
            orderBy = [desc(tags.name)];
            break;
        case 'usage_high':
            orderBy = [desc(tags.usage_count)];
            break;
        case 'usage_low':
            orderBy = [asc(tags.usage_count)];
            break;
        case 'updated_desc':
            orderBy = [desc(tags.updated_at)];
            break;
        case 'updated_asc':
            orderBy = [asc(tags.updated_at)];
            break;
        case 'type_asc':
            orderBy = [asc(tags.type)];
            break;
        case 'type_desc':
            orderBy = [desc(tags.type)];
            break;
        case 'status_asc':
            orderBy = [asc(tags.status)];
            break;
        case 'status_desc':
            orderBy = [desc(tags.status)];
            break;
    }

    // Fetch tags
    const tagsList = await tx
        .select()
        .from(tags)
        .where(and(...conditions))
        .orderBy(...orderBy)
        .limit(limitNum)
        .offset(offset);

    return {
        tags: tagsList,
        total,
        page: pageNum,
        limit: limitNum
    };
};
