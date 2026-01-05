/**
 * Gift Cards Interfaces
 *
 * Canonical TypeScript interfaces for gift card-related data.
 */

// ============================================
// GIFT CARD
// ============================================

export interface IGiftCard {
    id: string; // UUID
    code: string;
    pin?: string | null;
    initial_value: string; // Decimal
    current_balance: string; // Decimal
    currency: string;
    status: 'active' | 'partially_used' | 'fully_redeemed' | 'expired' | 'suspended' | 'cancelled';
    is_active: boolean;
    purchaser_user_id?: string | null;
    recipient_email?: string | null;
    recipient_name?: string | null;
    personal_message?: string | null;
    delivery_method?: 'email' | 'physical' | 'instant';
    delivery_scheduled_at?: Date | null;
    min_order_value?: string | null; // Decimal
    max_discount_percent?: number | null;
    applicable_product_ids?: string[]; // JSONB
    applicable_category_ids?: string[]; // JSONB
    excluded_product_ids?: string[]; // JSONB
    issued_at: Date;
    activated_at?: Date | null;
    expires_at?: Date | null;
    last_used_at?: Date | null;
    source: 'purchase' | 'promotion' | 'refund' | 'compensation' | 'bulk_import';
    source_order_id?: string | null; // UUID
    issued_by_admin_id?: string | null;
    template_id?: string | null; // UUID
    batch_id?: string | null; // UUID
    redemption_count: number;
    failed_attempts: number;
    last_failed_attempt_at?: Date | null;
    is_locked: boolean;
    locked_reason?: string | null;
    created_by?: string | null;
    created_at: Date;
    updated_at: Date;
    is_deleted: boolean;
    deleted_at?: Date | null;
    deleted_by?: string | null;
}

// ============================================
// GIFT CARD TRANSACTION
// ============================================

export interface IGiftCardTransaction {
    id: string; // UUID
    gift_card_id: string; // UUID
    type: 'issue' | 'redeem' | 'refund' | 'adjustment' | 'expiry_reversal' | 'cancellation';
    amount: string; // Decimal
    balance_before: string; // Decimal
    balance_after: string; // Decimal
    order_id?: string | null; // UUID
    refund_id?: string | null; // UUID
    performed_by_user_id?: string | null;
    performed_by_admin_id?: string | null;
    notes?: string | null;
    ip_address?: string | null;
    user_agent?: string | null;
    idempotency_key?: string | null;
    created_at: Date;
}

// ============================================
// GIFT CARD TEMPLATE
// ============================================

export interface IGiftCardTemplate {
    id: string; // UUID
    name: string;
    description?: string | null;
    prefix?: string | null;
    suffix?: string | null;
    code_length: number;
    segment_length: number;
    separator?: string | null;
    character_set: 'alphanumeric' | 'alphabets' | 'numbers';
    include_uppercase: boolean;
    include_lowercase: boolean;
    exclude_ambiguous: boolean;
    default_value?: string | null; // Decimal
    default_currency: string;
    default_expiry_days?: number | null;
    card_design_url?: string | null;
    email_template_id?: string | null; // UUID
    is_active: boolean;
    created_by?: string | null;
    created_at: Date;
    updated_at: Date;
    is_deleted: boolean;
    deleted_at?: Date | null;
    deleted_by?: number | null;
}
