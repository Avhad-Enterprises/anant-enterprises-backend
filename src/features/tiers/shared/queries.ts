/**
 * Tier Queries
 *
 * Reusable database queries for tier operations.
 * Extracted from API handlers per architecture guidelines.
 */

import { eq, and, sql, inArray } from 'drizzle-orm';
import { PgTransaction } from 'drizzle-orm/pg-core';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { db, schema } from '../../../database';
import { tiers, Tier, NewTier } from './tiers.schema';

type Database = NodePgDatabase<typeof schema> | PgTransaction<any, typeof schema, any>;

/**
 * Find tier by ID (excluding deleted tiers)
 */
export const findTierById = async (id: string, tx: Database = db): Promise<Tier | undefined> => {
    const [tier] = await tx
        .select()
        .from(tiers)
        .where(and(
            eq(tiers.id, id),
            eq(tiers.is_deleted, false)
        ))
        .limit(1);
    
    return tier;
};

/**
 * Find tier by code (excluding deleted tiers)
 */
export const findTierByCode = async (code: string, tx: Database = db): Promise<Tier | undefined> => {
    const [tier] = await tx
        .select()
        .from(tiers)
        .where(and(
            eq(tiers.code, code),
            eq(tiers.is_deleted, false)
        ))
        .limit(1);
    
    return tier;
};

/**
 * Check if tier code exists (excluding specific tier ID)
 */
export const isTierCodeTaken = async (
    code: string,
    excludeId?: string,
    tx: Database = db
): Promise<boolean> => {
    const conditions = [
        eq(tiers.code, code),
        eq(tiers.is_deleted, false)
    ];

    const result = await tx
        .select({ id: tiers.id })
        .from(tiers)
        .where(and(...conditions))
        .limit(1);

    if (result.length === 0) return false;
    if (excludeId && result[0].id === excludeId) return false;
    
    return true;
};

/**
 * Get tiers by level (excluding deleted)
 */
export const getTiersByLevel = async (level: number, tx: Database = db): Promise<Tier[]> => {
    return tx
        .select()
        .from(tiers)
        .where(and(
            eq(tiers.level, level),
            eq(tiers.is_deleted, false)
        ))
        .orderBy(tiers.priority, tiers.name);
};

/**
 * Get tiers by parent ID (excluding deleted)
 */
export const getTiersByParentId = async (
    parentId: string | null,
    tx: Database = db
): Promise<Tier[]> => {
    const condition = parentId 
        ? and(eq(tiers.parent_id, parentId), eq(tiers.is_deleted, false))
        : and(sql`${tiers.parent_id} IS NULL`, eq(tiers.is_deleted, false));

    return tx
        .select()
        .from(tiers)
        .where(condition)
        .orderBy(tiers.priority, tiers.name);
};

/**
 * Get active parent tier (for validation)
 */
export const getActiveParentTier = async (
    parentId: string,
    tx: Database = db
): Promise<Tier | undefined> => {
    const [parent] = await tx
        .select()
        .from(tiers)
        .where(and(
            eq(tiers.id, parentId),
            eq(tiers.status, 'active'),
            eq(tiers.is_deleted, false)
        ))
        .limit(1);

    return parent;
};

/**
 * Get all active tiers (excluding deleted)
 */
export const getActiveTiers = async (tx: Database = db): Promise<Tier[]> => {
    return tx
        .select()
        .from(tiers)
        .where(and(
            eq(tiers.status, 'active'),
            eq(tiers.is_deleted, false)
        ))
        .orderBy(tiers.level, tiers.priority, tiers.name);
};

/**
 * Create a new tier
 */
export const createTier = async (tierData: NewTier, tx: Database = db): Promise<Tier> => {
    const [newTier] = await tx
        .insert(tiers)
        .values(tierData)
        .returning();

    return newTier;
};

/**
 * Update tier by ID
 */
export const updateTierById = async (
    id: string,
    data: Partial<Omit<Tier, 'id' | 'created_at' | 'created_by'>>,
    tx: Database = db
): Promise<Tier | undefined> => {
    const [updatedTier] = await tx
        .update(tiers)
        .set({
            ...data,
            updated_at: new Date(),
        })
        .where(eq(tiers.id, id))
        .returning();

    return updatedTier;
};

/**
 * Soft delete tier by ID
 */
export const softDeleteTier = async (
    id: string,
    deletedBy: string,
    tx: Database = db
): Promise<Tier | undefined> => {
    const [deletedTier] = await tx
        .update(tiers)
        .set({
            is_deleted: true,
            deleted_by: deletedBy,
            deleted_at: new Date(),
            updated_at: new Date(),
        })
        .where(eq(tiers.id, id))
        .returning();

    return deletedTier;
};

/**
 * Bulk soft delete tiers
 */
export const bulkSoftDeleteTiers = async (
    ids: string[],
    deletedBy: string,
    tx: Database = db
): Promise<number> => {
    const result = await tx
        .update(tiers)
        .set({
            is_deleted: true,
            deleted_by: deletedBy,
            deleted_at: new Date(),
            updated_at: new Date(),
        })
        .where(inArray(tiers.id, ids));

    return result.rowCount || 0;
};

/**
 * Get tier hierarchy for a specific tier (parent chain)
 */
export const getTierAncestors = async (
    tierId: string,
    tx: Database = db
): Promise<Tier[]> => {
    const ancestors: Tier[] = [];
    let currentTier = await findTierById(tierId, tx);

    while (currentTier && currentTier.parent_id) {
        const parent = await findTierById(currentTier.parent_id, tx);
        if (parent) {
            ancestors.unshift(parent); // Add to beginning
            currentTier = parent;
        } else {
            break;
        }
    }

    return ancestors;
};

/**
 * Get all descendants of a tier (children at all levels)
 */
export const getTierDescendants = async (
    tierId: string,
    tx: Database = db
): Promise<Tier[]> => {
    const descendants: Tier[] = [];
    const queue: string[] = [tierId];

    while (queue.length > 0) {
        const currentId = queue.shift()!;
        const children = await tx
            .select()
            .from(tiers)
            .where(and(
                eq(tiers.parent_id, currentId),
                eq(tiers.is_deleted, false)
            ));

        for (const child of children) {
            descendants.push(child);
            queue.push(child.id);
        }
    }

    return descendants;
};

/**
 * Check if tier has children
 */
export const tierHasChildren = async (
    tierId: string,
    tx: Database = db
): Promise<boolean> => {
    const [result] = await tx
        .select({ id: tiers.id })
        .from(tiers)
        .where(and(
            eq(tiers.parent_id, tierId),
            eq(tiers.is_deleted, false)
        ))
        .limit(1);

    return !!result;
};

/**
 * Get tiers by IDs (for batch operations)
 */
export const getTiersByIds = async (
    ids: string[],
    tx: Database = db
): Promise<Tier[]> => {
    if (ids.length === 0) return [];

    return tx
        .select()
        .from(tiers)
        .where(and(
            inArray(tiers.id, ids),
            eq(tiers.is_deleted, false)
        ));
};

/**
 * Get tier statistics
 */
export const getTierStats = async (tx: Database = db) => {
    const result = await tx
        .select({
            total: sql<number>`count(*)`,
            active: sql<number>`count(*) filter (where ${tiers.status} = 'active')`,
            inactive: sql<number>`count(*) filter (where ${tiers.status} = 'inactive')`,
            level1: sql<number>`count(*) filter (where ${tiers.level} = 1)`,
            level2: sql<number>`count(*) filter (where ${tiers.level} = 2)`,
            level3: sql<number>`count(*) filter (where ${tiers.level} = 3)`,
            level4: sql<number>`count(*) filter (where ${tiers.level} = 4)`,
        })
        .from(tiers)
        .where(eq(tiers.is_deleted, false));

    return result[0];
};
