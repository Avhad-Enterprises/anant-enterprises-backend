/**
 * Blog Search Utilities
 * Provides fuzzy search capabilities using PostgreSQL pg_trgm extension
 */

import { sql, ilike, or, SQL } from 'drizzle-orm';
import { blogs } from './blog.schema';

/**
 * Build fuzzy + exact search conditions for blogs
 * Combines pg_trgm similarity with ILIKE for content fields
 * 
 * @param searchQuery - The search term from the user
 * @returns SQL condition combining fuzzy title matching with description search
 * 
 * @example
 * const searchConditions = buildBlogSearchConditions("Artifical Intelligence");
 * // Will match "Artificial Intelligence" (fuzzy) and exact matches in description
 */
export function buildBlogSearchConditions(
    searchQuery: string
): SQL | undefined {
    const trimmedQuery = searchQuery.trim();
    const searchPattern = `%${trimmedQuery}%`;

    // Fuzzy matching on title (using pg_trgm similarity)
    // Threshold 0.15 = 15% similarity required (handles 1-2 character typos)
    const fuzzyTitle = sql`similarity(${blogs.title}, ${trimmedQuery}) > 0.15`;

    // Fuzzy matching on author name (for author searches)
    const fuzzyAuthor = sql`similarity(${blogs.author}, ${trimmedQuery}) > 0.15`;

    // Exact/substring matching on description
    // Description is longer text, so ILIKE is more appropriate than fuzzy
    const exactDescription = ilike(blogs.description, searchPattern);

    // Combine: Fuzzy title OR fuzzy author OR exact description
    return or(fuzzyTitle, fuzzyAuthor, exactDescription);
}
