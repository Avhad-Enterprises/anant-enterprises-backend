/**
 * Tier Utilities
 *
 * Shared utility functions for tier operations.
 */

/**
 * Generate URL-friendly code from tier name
 * Converts to lowercase, replaces spaces with hyphens, removes special chars
 * 
 * @param name - Tier name
 * @returns URL-friendly code
 * 
 * @example
 * generateTierCode("Electronics & Gadgets") // "electronics-gadgets"
 * generateTierCode("Men's Fashion")         // "mens-fashion"
 */
export function generateTierCode(name: string): string {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')  // Remove special characters
        .replace(/\s+/g, '-')       // Replace spaces with hyphens
        .replace(/--+/g, '-')       // Replace multiple hyphens with single
        .replace(/^-+|-+$/g, '');   // Trim hyphens from start/end
}

/**
 * Generate unique tier code by appending number if needed
 * 
 * @param baseCode - Base code to make unique
 * @param existingCodes - Set of existing codes to check against
 * @returns Unique code
 * 
 * @example
 * generateUniqueTierCode("electronics", new Set(["electronics"]))
 * // Returns: "electronics-2"
 */
export function generateUniqueTierCode(
    baseCode: string,
    existingCodes: Set<string>
): string {
    let code = baseCode;
    let counter = 2;

    while (existingCodes.has(code)) {
        code = `${baseCode}-${counter}`;
        counter++;
    }

    return code;
}

/**
 * Format tier level as human-readable string
 * 
 * @param level - Tier level (1-4)
 * @returns Formatted level string
 */
export function formatTierLevel(level: number): string {
    const levelNames: Record<number, string> = {
        1: 'Level 1 (Root)',
        2: 'Level 2 (Category)',
        3: 'Level 3 (Subcategory)',
        4: 'Level 4 (Item)',
    };

    return levelNames[level] || `Level ${level}`;
}

/**
 * Build tier breadcrumb path
 * 
 * @param tierChain - Array of tiers from root to current
 * @returns Breadcrumb string
 * 
 * @example
 * buildTierBreadcrumb([rootTier, categoryTier, subcategoryTier])
 * // Returns: "Electronics > Computers > Laptops"
 */
export function buildTierBreadcrumb(tierChain: Array<{ name: string }>): string {
    return tierChain.map(tier => tier.name).join(' > ');
}

/**
 * Build tier code path (for URLs)
 * 
 * @param tierChain - Array of tiers from root to current
 * @returns URL path string
 * 
 * @example
 * buildTierCodePath([rootTier, categoryTier, subcategoryTier])
 * // Returns: "electronics/computers/laptops"
 */
export function buildTierCodePath(tierChain: Array<{ code: string }>): string {
    return tierChain.map(tier => tier.code).join('/');
}

/**
 * Validate tier name format
 * 
 * @param name - Tier name to validate
 * @returns Validation result with error message if invalid
 */
export function validateTierName(name: string): { valid: boolean; error?: string } {
    if (!name || name.trim().length === 0) {
        return { valid: false, error: 'Tier name is required' };
    }

    if (name.length > 255) {
        return { valid: false, error: 'Tier name must be 255 characters or less' };
    }

    // Check for invalid characters that might cause issues
    const invalidChars = /[<>{}[\]\\]/;
    if (invalidChars.test(name)) {
        return { valid: false, error: 'Tier name contains invalid characters' };
    }

    return { valid: true };
}

/**
 * Sort tiers by priority then name
 * Modifies array in place
 */
export function sortTiers<T extends { priority: number; name: string }>(tiers: T[]): T[] {
    return tiers.sort((a, b) => {
        // Sort by priority first (ascending)
        if (a.priority !== b.priority) {
            return a.priority - b.priority;
        }
        // Then by name alphabetically
        return a.name.localeCompare(b.name);
    });
}

/**
 * Calculate maximum depth of tier hierarchy
 */
export function calculateHierarchyDepth(
    tiers: Array<{ level: number }>
): number {
    if (tiers.length === 0) return 0;
    return Math.max(...tiers.map(tier => tier.level));
}

/**
 * Group tiers by level
 */
export function groupTiersByLevel<T extends { level: number }>(
    tiers: T[]
): Record<number, T[]> {
    return tiers.reduce((acc, tier) => {
        const level = tier.level;
        if (!acc[level]) {
            acc[level] = [];
        }
        acc[level].push(tier);
        return acc;
    }, {} as Record<number, T[]>);
}

/**
 * Check if tier can be safely deleted
 * A tier can be deleted if:
 * 1. It has no children
 * 2. It's not being used by products (usage_count = 0)
 */
export function canDeleteTier(tier: { usage_count: number }): {
    canDelete: boolean;
    reason?: string;
} {
    if (tier.usage_count > 0) {
        return {
            canDelete: false,
            reason: `Tier is being used by ${tier.usage_count} product(s)`,
        };
    }

    return { canDelete: true };
}

/**
 * Get tier level name
 */
export function getTierLevelName(level: number): string {
    const levelNames: Record<number, string> = {
        1: 'Root Category',
        2: 'Main Category',
        3: 'Subcategory',
        4: 'Product Type',
    };

    return levelNames[level] || `Level ${level}`;
}
