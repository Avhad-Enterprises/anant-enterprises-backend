/**
 * Tag Interfaces
 *
 * Canonical TypeScript interfaces for tag data.
 */

// ============================================
// TAG
// ============================================

export interface ITag {
    id: string; // UUID
    name: string;
    type: string;

    usage_count: number;
    status: boolean;

    created_at: Date;
    updated_at: Date;
}

// ============================================
// PRODUCT TAG LINK
// ============================================

export interface IProductTag {
    product_id: string;
    tag_id: string;
}
