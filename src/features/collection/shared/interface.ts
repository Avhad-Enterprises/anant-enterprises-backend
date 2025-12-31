/**
 * Collection Interfaces
 *
 * Canonical TypeScript interfaces for collection data.
 */

// ============================================
// COLLECTION
// ============================================

export interface ICollection {
    id: string; // UUID
    title: string;
    slug: string;
    description?: string | null;

    type: 'manual' | 'automated';
    status: 'active' | 'inactive' | 'draft';
    sort_order: 'best-selling' | 'price-asc' | 'price-desc' | 'manual' | 'created-desc' | 'created-asc';

    condition_match_type?: 'all' | 'any' | null;

    banner_image_url?: string | null;
    mobile_banner_image_url?: string | null;

    meta_title?: string | null;
    meta_description?: string | null;

    tags: string[]; // JSONB array -> string[]

    published_at?: Date | null;
    created_at: Date;
    updated_at: Date;
    created_by?: string | null; // UUID string
}

// ============================================
// COLLECTION RULE
// ============================================

export interface ICollectionRule {
    id: string; // UUID
    collection_id: string;
    field: string;
    operator: string;
    value: string;
}

// ============================================
// COLLECTION PRODUCT
// ============================================

export interface ICollectionProduct {
    collection_id: string;
    product_id: string;
    position: number;
}
