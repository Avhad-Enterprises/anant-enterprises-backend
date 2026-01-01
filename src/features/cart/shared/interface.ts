/**
 * Cart Interfaces
 *
 * Canonical TypeScript interfaces for cart-related data.
 */

// ============================================
// CART
// ============================================

export interface ICart {
    id: string; // UUID
    user_id?: string | null;
    session_id?: string | null;
    currency: string;
    subtotal: string; // Decimal
    discount_total: string; // Decimal
    giftcard_total: string; // Decimal
    shipping_total: string; // Decimal
    tax_total: string; // Decimal
    grand_total: string; // Decimal
    applied_discount_codes?: Record<string, unknown>[]; // JSONB
    applied_giftcard_codes?: Record<string, unknown>[]; // JSONB
    cart_status: 'active' | 'converted' | 'abandoned';
    source: 'web' | 'app';
    last_activity_at: Date;
    abandoned_at?: Date | null;
    recovery_email_sent: boolean;
    recovery_email_sent_at?: Date | null;
    created_at: Date;
    updated_at: Date;
    is_deleted: boolean;
    deleted_at?: Date | null;
    created_by?: string | null;
    updated_by?: string | null;
    deleted_by?: string | null;
}

// ============================================
// CART ITEM
// ============================================

export interface ICartItem {
    id: string; // UUID
    cart_id: string; // UUID
    product_id?: string | null; // UUID
    bundle_id?: string | null; // UUID
    quantity: number;
    cost_price: string; // Decimal
    final_price: string; // Decimal
    discount_amount: string; // Decimal
    line_subtotal: string; // Decimal
    line_total: string; // Decimal
    product_name?: string | null;
    product_image_url?: string | null;
    product_sku?: string | null;
    customization_data?: Record<string, unknown>; // JSONB
    created_at: Date;
    updated_at: Date;
    is_deleted: boolean;
    deleted_at?: Date | null;
}
