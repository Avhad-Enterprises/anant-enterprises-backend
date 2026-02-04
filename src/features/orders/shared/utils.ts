/**
 * Orders Utility Functions
 *
 * Shared utility functions for order-related operations
 */

/**
 * Format a date for display in a human-readable format
 * @param date - Date to format, can be null
 * @returns Formatted date string (e.g., "Jan 15, 2026") or empty string if null
 * 
 * @example
 * formatDate(new Date('2026-01-15')) // "Jan 15, 2026"
 * formatDate(null) // ""
 */
export const formatDate = (date: Date | null): string => {
    if (!date) return '';
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    }).format(date);
};
