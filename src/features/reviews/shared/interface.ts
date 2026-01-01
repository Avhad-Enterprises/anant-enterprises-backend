/**
 * Reviews & Q/A Interfaces
 *
 * Canonical TypeScript interfaces for user interaction data.
 */

// ============================================
// REVIEW
// ============================================

export interface IReview {
    id: string; // UUID
    product_id: string; // UUID
    user_id: number;
    rating: number;
    title?: string | null;
    comment?: string | null;
    media_urls?: string[]; // JSONB
    is_verified_purchase: boolean;
    status: 'pending' | 'approved' | 'rejected';
    admin_reply?: string | null;
    helpful_votes: number;
    created_at: Date;
    updated_at: Date;
    is_deleted: boolean;
}

// ============================================
// PRODUCT QUESTION
// ============================================

export interface IProductQuestion {
    id: string; // UUID
    product_id: string; // UUID
    user_id: number;
    question: string;
    answer?: string | null;
    answered_by?: number | null;
    status: 'pending' | 'answered' | 'rejected';
    is_public: boolean;
    created_at: Date;
    updated_at: Date;
    is_deleted: boolean;
}
