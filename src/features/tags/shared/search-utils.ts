/**
 * Tag Search Utilities
 * Provides fuzzy search capabilities using PostgreSQL pg_trgm extension
 */

import { sql, ilike, or, SQL } from 'drizzle-orm';
import { tags } from './tags.schema';

/**
 * Build fuzzy + exact search conditions for tags
 * Combines pg_trgm similarity with ILIKE for name
 * 
 * @param searchQuery - The search term from the user
 * @returns SQL condition combining fuzzy name matching
 * 
 * @example
 * const searchConditions = buildTagSearchConditions("relevnt");
 * // Will match "Relevant" (fuzzy)
 */
export function buildTagSearchConditions(
    searchQuery: string
): SQL | undefined {
    const trimmedQuery = searchQuery.trim();
    const searchPattern = `%${trimmedQuery}%`;

    // Fuzzy matching on name (using pg_trgm similarity)
    // Threshold 0.2 = 20% similarity required (tags are short, so slightly stricter threshold than others)
    const fuzzyName = sql`similarity(${tags.name}, ${trimmedQuery}) > 0.2`;

    // Exact/substring matching on name (standard ILIKE)
    const exactName = ilike(tags.name, searchPattern);

    // Combine: Fuzzy name OR exact name
    return or(fuzzyName, exactName);
}
