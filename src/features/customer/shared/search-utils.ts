/**
 * Customer Search Utilities
 * Provides fuzzy search capabilities using PostgreSQL pg_trgm extension
 */

import { sql, ilike, or, SQL } from 'drizzle-orm';
import { users } from '../../user/shared/user.schema';

/**
 * Build fuzzy + exact search conditions for customers
 * Combines pg_trgm similarity with ILIKE for identifiers
 * 
 * @param searchQuery - The search term from the user
 * @returns SQL condition combining fuzzy name matching with exact identifier matching
 * 
 * @example
 * const searchConditions = buildCustomerSearchConditions("Jhon");
 * // Will match "John" (fuzzy) and exact matches on email/phone
 */
export function buildCustomerSearchConditions(
    searchQuery: string
): SQL | undefined {
    const trimmedQuery = searchQuery.trim();
    const searchPattern = `%${trimmedQuery}%`;

    // Fuzzy matching on names (using pg_trgm similarity)
    // Threshold 0.15 = 15% similarity required (handles 1-2 character typos)
    const fuzzyFirstName = sql`similarity(${users.first_name}, ${trimmedQuery}) > 0.15`;
    const fuzzyLastName = sql`similarity(${users.last_name}, ${trimmedQuery}) > 0.15`;
    const fuzzyDisplayName = sql`similarity(${users.display_name}, ${trimmedQuery}) > 0.15`;

    // Exact/substring matching on identifiers (email, phone)
    // These should remain precise for data integrity
    const exactEmail = ilike(users.email, searchPattern);
    const exactPhone = ilike(users.phone_number, searchPattern);

    // Combine: Fuzzy names OR exact identifiers
    return or(
        fuzzyFirstName,
        fuzzyLastName,
        fuzzyDisplayName,
        exactEmail,
        exactPhone
    );
}
