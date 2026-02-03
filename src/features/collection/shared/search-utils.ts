/**
 * Collection Search Utilities
 * Provides fuzzy search capabilities using PostgreSQL pg_trgm extension
 */

import { sql, ilike, or, SQL } from 'drizzle-orm';
import { collections } from './collection.schema';

/**
 * Build fuzzy + exact search conditions for collections
 * Combines pg_trgm similarity with ILIKE for description
 */
export function buildCollectionSearchConditions(
    searchQuery: string
): SQL | undefined {
    const trimmedQuery = searchQuery.trim();
    const searchPattern = `%${trimmedQuery}%`;

    // Fuzzy matching on title (0.15 similarity threshold)
    const fuzzyTitle = sql`similarity(${collections.title}, ${trimmedQuery}) > 0.15`;

    // Exact matching on description
    const exactDescription = ilike(collections.description, searchPattern);

    return or(fuzzyTitle, exactDescription);
}
