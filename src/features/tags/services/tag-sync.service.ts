/**
 * Tag Sync Service
 * 
 * Automatically creates/updates tags when entities use them.
 * Maintains tag usage counts.
 */

import { eq, sql } from 'drizzle-orm';
import { db } from '../../../database';
import { tags } from '../shared/tags.schema';

/**
 * Sync tags to master table
 * - Creates new tags if they don't exist
 * - Increments usage_count for existing tags
 * 
 * @param tagNames - Array of tag names to sync
 * @param type - Tag type ('product', 'collection', etc.)
 */
export async function syncTags(tagNames: string[], type: string = 'product'): Promise<void> {
    if (!tagNames || tagNames.length === 0) return;

    // Normalize tag names (trim, lowercase for comparison)
    const normalizedTags = tagNames
        .map(t => t.trim())
        .filter(t => t.length > 0)
        .map(t => t.toLowerCase());

    if (normalizedTags.length === 0) return;

    // For each tag, insert or increment usage count
    for (const tagName of normalizedTags) {
        await db
            .insert(tags)
            .values({
                name: tagName,
                type,
                usage_count: 1,
                status: true,
            })
            .onConflictDoUpdate({
                target: tags.name,
                set: {
                    usage_count: sql`${tags.usage_count} + 1`,
                    updated_at: new Date(),
                },
            });
    }
}

/**
 * Decrement usage count when tags are removed
 * 
 * @param tagNames - Array of tag names that were removed
 */
export async function decrementTagUsage(tagNames: string[]): Promise<void> {
    if (!tagNames || tagNames.length === 0) return;

    const normalizedTags = tagNames
        .map(t => t.trim().toLowerCase())
        .filter(t => t.length > 0);

    if (normalizedTags.length === 0) return;

    for (const tagName of normalizedTags) {
        // Decrement, but don't go below 0
        await db
            .update(tags)
            .set({
                usage_count: sql`GREATEST(0, ${tags.usage_count} - 1)`,
                updated_at: new Date(),
            })
            .where(eq(tags.name, tagName));
    }
}

/**
 * Update tag usage when entity tags change
 * Handles both additions and removals
 * 
 * @param oldTags - Previous tags
 * @param newTags - New tags
 * @param type - Tag type
 */
export async function updateTagUsage(
    oldTags: string[] = [],
    newTags: string[] = [],
    type: string = 'product'
): Promise<void> {
    const oldSet = new Set(oldTags.map(t => t.toLowerCase()));
    const newSet = new Set(newTags.map(t => t.toLowerCase()));

    // Tags that were added
    const addedTags = newTags.filter(t => !oldSet.has(t.toLowerCase()));

    // Tags that were removed
    const removedTags = oldTags.filter(t => !newSet.has(t.toLowerCase()));

    // Sync new tags
    if (addedTags.length > 0) {
        await syncTags(addedTags, type);
    }

    // Decrement removed tags
    if (removedTags.length > 0) {
        await decrementTagUsage(removedTags);
    }
}
