/**
 * Product Interfaces
 *
 * Canonical TypeScript interfaces for product data.
 * These decouple logic from database implementation details.
 */

// ============================================
// PRODUCT
// ============================================

export interface IProduct {
    id: string; // UUID
    slug: string;
    product_title: string;
    secondary_title?: string | null;

    short_description?: string | null;
    full_description?: string | null;

    status: 'draft' | 'active' | 'archived' | 'schedule';
    scheduled_publish_at?: Date | null;
    is_delisted: boolean;
    delist_date?: Date | null;
    sales_channels: string[]; // JSONB array -> string[]

    cost_price: string; // Decimal string
    selling_price: string; // Decimal string
    compare_at_price?: string | null; // Decimal string

    sku: string;
    barcode?: string | null;
    hsn_code?: string | null;
    inventory_quantity: number;

    weight?: string | null;
    length?: string | null;
    breadth?: string | null;
    height?: string | null;
    pickup_location?: string | null;

    category_tier_1?: string | null;
    category_tier_2?: string | null;
    category_tier_3?: string | null;
    category_tier_4?: string | null;

    size_group?: string | null;
    accessories_group?: string | null;

    primary_image_url?: string | null;
    additional_images: string[]; // JSONB array -> string[]

    meta_title?: string | null;
    meta_description?: string | null;

    is_limited_edition: boolean;
    is_preorder_enabled: boolean;
    preorder_release_date?: Date | null;
    is_gift_wrap_available: boolean;

    created_at: Date;
    updated_at: Date;
    created_by?: string | null;
    updated_by?: string | null;

    is_deleted: boolean;
    deleted_at?: Date | null;
    deleted_by?: string | null;
}

// ============================================
// PRODUCT VARIANT
// ============================================

export interface IProductVariant {
    id: string; // UUID
    product_id: string;

    option_name: string;
    option_value: string;

    sku: string;
    price?: string | null;
    inventory_quantity: number;

    image_url?: string | null;

    is_active: boolean;
    created_at: Date;
    updated_at: Date;
}

// ============================================
// PRODUCT FAQ
// ============================================

export interface IProductFaq {
    id: string; // UUID
    product_id: string;

    question: string;
    answer: string;

    created_at: Date;
    updated_at: Date;
}
