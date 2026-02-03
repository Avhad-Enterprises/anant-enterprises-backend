/**
 * Tier Search Utilities
 * Provides fuzzy search capabilities using PostgreSQL pg_trgm extension
 */

import { sql, ilike, or, SQL } from 'drizzle-orm';
import { tiers } from './tiers.schema';

/**
 * Build fuzzy + exact search conditions for tiers
 * Combines pg_trgm similarity with ILIKE for codes
 * 
 * @param searchQuery - The search term from the user
 * @returns SQL condition combining fuzzy name matching and exact code search
 * 
 * @example
 * const searchConditions = buildTierSearchConditions("Silvr");
 * // Will match "Silver Tier" (fuzzy) or code "SILVER" (exact/substring)
 */
export function buildTierSearchConditions(
    searchQuery: string
): SQL | undefined {
    const trimmedQuery = searchQuery.trim();
    const searchPattern = `%${trimmedQuery}%`;

    // Fuzzy matching on name (using pg_trgm similarity)
    // Threshold 0.15 = 15% similarity
    const fuzzyName = sql`similarity(${tiers.name}, ${trimmedQuery}) > 0.15`;

    // Exact/substring matching on tier code
    // Codes are usually short identifiers, so exact/substring is better than fuzzy
    const exactCode = ilike(tiers.code, searchPattern);

    // Combine: Fuzzy name OR exact code
    return or(fuzzyName, exactCode);
}
