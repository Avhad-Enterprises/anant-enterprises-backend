/**
 * Discount Interfaces
 *
 * Canonical TypeScript interfaces for discount data.
 */

// ============================================
// DISCOUNT
// ============================================

export interface IDiscount {
    id: string; // UUID
    title: string;

    type: 'percentage' | 'fixed_amount' | 'free_shipping' | 'buy_x_get_y';
    value: string | null; // Decimal string

    min_requirement_type: 'none' | 'min_amount' | 'min_quantity';
    min_requirement_value: string | null;

    usage_limit: number | null;
    once_per_customer: boolean;

    starts_at: Date;
    ends_at: Date | null;

    status: 'active' | 'inactive' | 'draft' | 'scheduled' | 'expired';

    created_at: Date;
    updated_at: Date;
    created_by?: string | null;
}

// ============================================
// DISCOUNT CODE
// ============================================

export interface IDiscountCode {
    code: string;
    discount_id: string;
    usage_limit: number | null;
    usage_count: number;
}
