/**
 * Admin Search Utilities
 * Provides fuzzy search capabilities using PostgreSQL pg_trgm extension
 */

import { sql, ilike, or, SQL } from 'drizzle-orm';
import { users } from '../../user/shared/user.schema';
import { adminProfiles } from './admin-profiles.schema';

/**
 * Build fuzzy + exact search conditions for admins
 * Combines pg_trgm similarity with ILIKE for identifiers
 * 
 * @param searchQuery - The search term from the user
 * @returns SQL condition combining fuzzy name matching matches
 * 
 * @example
 * const searchConditions = buildAdminSearchConditions("Managr");
 * // Will match "Manager" (fuzzy on job title)
 */
export function buildAdminSearchConditions(
    searchQuery: string
): SQL | undefined {
    const trimmedQuery = searchQuery.trim();
    const searchPattern = `%${trimmedQuery}%`;

    // Fuzzy matching on names matches (using pg_trgm similarity)
    // Threshold 0.15 = 15% similarity
    const fuzzyFirstName = sql`similarity(${users.first_name}, ${trimmedQuery}) > 0.15`;
    const fuzzyLastName = sql`similarity(${users.last_name}, ${trimmedQuery}) > 0.15`;

    // Fuzzy on job title
    const fuzzyJobTitle = sql`similarity(${adminProfiles.job_title}, ${trimmedQuery}) > 0.15`;

    // Exact/substring matching on identifiers
    const exactEmail = ilike(users.email, searchPattern);
    const exactEmployeeId = ilike(adminProfiles.employee_id, searchPattern);

    // Combine: Fuzzy fields OR exact identifiers
    return or(
        fuzzyFirstName,
        fuzzyLastName,
        fuzzyJobTitle,
        exactEmail,
        exactEmployeeId
    );
}
