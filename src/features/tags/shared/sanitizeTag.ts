/**
 * Tag Response Sanitizers
 *
 * Functions to sanitize tag responses by removing sensitive fields.
 * Per architecture guidelines: never expose audit fields (created_by, updated_by, deleted_by, deleted_at, is_deleted).
 */

import { Tag } from './tags.schema';

/**
 * Sanitized tag response interface
 */
export interface SanitizedTag {
    id: string;
    name: string;
    type: string;
    status: boolean;
    usage_count: number;
    created_at: Date;
    updated_at: Date;
}

/**
 * Minimal tag response (for dropdowns, autocomplete, etc.)
 */
export interface MinimalTag {
    id: string;
    name: string;
    type: string;
}

/**
 * Tag with usage statistics
 */
export interface TagWithStats extends SanitizedTag {
    is_used: boolean;
    last_used_at?: Date;
}

/**
 * Sanitize a single tag
 * Removes sensitive audit fields from tag response
 */
export const sanitizeTag = (tag: Tag): SanitizedTag => {
    return {
        id: tag.id,
        name: tag.name,
        type: tag.type,
        status: tag.status,
        usage_count: tag.usage_count,
        created_at: tag.created_at,
        updated_at: tag.updated_at,
    };
};

/**
 * Sanitize an array of tags
 */
export const sanitizeTags = (tags: Tag[]): SanitizedTag[] => {
    return tags.map(sanitizeTag);
};

/**
 * Convert tag to minimal format (id, name, type only)
 */
export const toMinimalTag = (tag: Tag): MinimalTag => {
    return {
        id: tag.id,
        name: tag.name,
        type: tag.type,
    };
};

/**
 * Convert tags to minimal format
 */
export const toMinimalTags = (tags: Tag[]): MinimalTag[] => {
    return tags.map(toMinimalTag);
};

/**
 * Sanitize tag with usage statistics
 */
export const sanitizeTagWithStats = (tag: Tag, lastUsedAt?: Date): TagWithStats => {
    return {
        ...sanitizeTag(tag),
        is_used: tag.usage_count > 0,
        last_used_at: lastUsedAt,
    };
};

/**
 * Group tags by type
 */
export interface TagsByType {
    customer: SanitizedTag[];
    product: SanitizedTag[];
    blogs: SanitizedTag[];
    order: SanitizedTag[];
}

export const groupTagsByType = (tags: Tag[]): TagsByType => {
    const grouped: TagsByType = {
        customer: [],
        product: [],
        blogs: [],
        order: [],
    };

    tags.forEach(tag => {
        const sanitized = sanitizeTag(tag);
        if (tag.type in grouped) {
            grouped[tag.type as keyof TagsByType].push(sanitized);
        }
    });

    return grouped;
};

/**
 * Format tag for dropdown/select options
 */
export interface TagOption {
    value: string;
    label: string;
    type: string;
    disabled?: boolean;
}

export const toTagOption = (tag: Tag, disabled = false): TagOption => {
    return {
        value: tag.id,
        label: tag.name,
        type: tag.type,
        disabled: disabled || !tag.status,
    };
};

export const toTagOptions = (tags: Tag[]): TagOption[] => {
    return tags.map(tag => toTagOption(tag));
};
