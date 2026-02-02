/**
 * Tag Utility Functions
 *
 * Shared utility functions for tag operations.
 * Extracted from API handlers per architecture guidelines.
 */

import { TagType } from './interface';

/**
 * Slugify tag name for URL-safe usage
 */
export const slugifyTagName = (name: string): string => {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '') // Remove special characters
        .replace(/[\s_]+/g, '-')   // Replace spaces and underscores with hyphens
        .replace(/^-+|-+$/g, '');  // Remove leading/trailing hyphens
};

/**
 * Format tag name for display (capitalize first letter of each word)
 */
export const formatTagName = (name: string): string => {
    return name
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

/**
 * Get tag type display name
 */
export const getTagTypeLabel = (type: TagType): string => {
    const labels: Record<TagType, string> = {
        customer: 'Customer',
        product: 'Product',
        blogs: 'Blog',
        order: 'Order',
    };
    return labels[type] || type;
};

/**
 * Get tag type icon (for UI)
 */
export const getTagTypeIcon = (type: TagType): string => {
    const icons: Record<TagType, string> = {
        customer: '👤',
        product: '📦',
        blogs: '📝',
        order: '🛒',
    };
    return icons[type] || '🏷️';
};

/**
 * Get tag type color (for UI)
 */
export const getTagTypeColor = (type: TagType): string => {
    const colors: Record<TagType, string> = {
        customer: 'blue',
        product: 'green',
        blogs: 'purple',
        order: 'orange',
    };
    return colors[type] || 'gray';
};

/**
 * Validate tag name format (alphanumeric, spaces, hyphens, underscores only)
 */
export const validateTagNameFormat = (name: string): { valid: boolean; error?: string } => {
    if (!name || name.trim().length === 0) {
        return { valid: false, error: 'Tag name cannot be empty' };
    }

    if (name.length > 255) {
        return { valid: false, error: 'Tag name cannot exceed 255 characters' };
    }

    const validPattern = /^[a-zA-Z0-9\s\-_]+$/;
    if (!validPattern.test(name)) {
        return { 
            valid: false, 
            error: 'Tag name can only contain letters, numbers, spaces, hyphens, and underscores' 
        };
    }

    return { valid: true };
};

/**
 * Sort tags by name (case-insensitive)
 */
export const sortTagsByName = <T extends { name: string }>(tags: T[], ascending = true): T[] => {
    return [...tags].sort((a, b) => {
        const comparison = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
        return ascending ? comparison : -comparison;
    });
};

/**
 * Sort tags by usage count
 */
export const sortTagsByUsage = <T extends { usage_count: number }>(
    tags: T[],
    descending = true
): T[] => {
    return [...tags].sort((a, b) => {
        return descending 
            ? b.usage_count - a.usage_count 
            : a.usage_count - b.usage_count;
    });
};

/**
 * Filter tags by type
 */
export const filterTagsByType = <T extends { type: string }>(
    tags: T[],
    type: TagType
): T[] => {
    return tags.filter(tag => tag.type === type);
};

/**
 * Filter tags by status
 */
export const filterTagsByStatus = <T extends { status: boolean }>(
    tags: T[],
    status: boolean
): T[] => {
    return tags.filter(tag => tag.status === status);
};

/**
 * Get active tags only
 */
export const getActiveTags = <T extends { status: boolean }>(tags: T[]): T[] => {
    return tags.filter(tag => tag.status === true);
};

/**
 * Get inactive tags only
 */
export const getInactiveTags = <T extends { status: boolean }>(tags: T[]): T[] => {
    return tags.filter(tag => tag.status === false);
};

/**
 * Check if tag is used (has usage count > 0)
 */
export const isTagUsed = (usageCount: number): boolean => {
    return usageCount > 0;
};

/**
 * Calculate tag usage percentage
 */
export const calculateTagUsagePercentage = (
    usageCount: number,
    totalPossibleUsages: number
): number => {
    if (totalPossibleUsages === 0) return 0;
    return Math.round((usageCount / totalPossibleUsages) * 100);
};

/**
 * Generate tag color based on usage count (for heatmap visualization)
 */
export const getTagUsageColor = (usageCount: number, maxUsage: number): string => {
    if (maxUsage === 0) return '#e0e0e0'; // Gray for unused

    const percentage = (usageCount / maxUsage) * 100;

    if (percentage === 0) return '#e0e0e0';       // Gray
    if (percentage < 25) return '#c8e6c9';        // Light green
    if (percentage < 50) return '#81c784';        // Medium green
    if (percentage < 75) return '#4caf50';        // Green
    return '#2e7d32';                              // Dark green
};

/**
 * Extract unique tag names from an array of tags
 */
export const extractUniqueTagNames = <T extends { name: string }>(tags: T[]): string[] => {
    return Array.from(new Set(tags.map(tag => tag.name)));
};

/**
 * Check if two tag names are similar (case-insensitive)
 */
export const areTagNamesSimilar = (name1: string, name2: string): boolean => {
    return name1.toLowerCase().trim() === name2.toLowerCase().trim();
};

/**
 * Find duplicate tag names in an array
 */
export const findDuplicateTagNames = (names: string[]): string[] => {
    const normalized = names.map(name => name.toLowerCase().trim());
    const duplicates = normalized.filter((name, index) => normalized.indexOf(name) !== index);
    return Array.from(new Set(duplicates));
};

/**
 * Merge tag arrays and remove duplicates by name
 */
export const mergeTagsUnique = <T extends { name: string }>(
    tags1: T[],
    tags2: T[]
): T[] => {
    const merged = [...tags1];
    const existingNames = new Set(tags1.map(t => t.name.toLowerCase()));

    for (const tag of tags2) {
        if (!existingNames.has(tag.name.toLowerCase())) {
            merged.push(tag);
            existingNames.add(tag.name.toLowerCase());
        }
    }

    return merged;
};

/**
 * Group tags by first letter (for alphabetical navigation)
 */
export const groupTagsByFirstLetter = <T extends { name: string }>(
    tags: T[]
): Record<string, T[]> => {
    const grouped: Record<string, T[]> = {};

    for (const tag of tags) {
        const firstLetter = tag.name.charAt(0).toUpperCase();
        if (!grouped[firstLetter]) {
            grouped[firstLetter] = [];
        }
        grouped[firstLetter].push(tag);
    }

    return grouped;
};

/**
 * Calculate tag statistics summary
 */
export interface TagStatsSummary {
    total: number;
    active: number;
    inactive: number;
    used: number;
    unused: number;
    totalUsageCount: number;
    averageUsageCount: number;
    byType: Record<TagType, number>;
}

export const calculateTagStats = <T extends { status: boolean; usage_count: number; type: string }>(
    tags: T[]
): TagStatsSummary => {
    const stats: TagStatsSummary = {
        total: tags.length,
        active: 0,
        inactive: 0,
        used: 0,
        unused: 0,
        totalUsageCount: 0,
        averageUsageCount: 0,
        byType: {
            customer: 0,
            product: 0,
            blogs: 0,
            order: 0,
        },
    };

    for (const tag of tags) {
        if (tag.status) stats.active++;
        else stats.inactive++;

        if (tag.usage_count > 0) stats.used++;
        else stats.unused++;

        stats.totalUsageCount += tag.usage_count;

        if (tag.type in stats.byType) {
            stats.byType[tag.type as TagType]++;
        }
    }

    stats.averageUsageCount = stats.total > 0 
        ? Math.round(stats.totalUsageCount / stats.total) 
        : 0;

    return stats;
};
