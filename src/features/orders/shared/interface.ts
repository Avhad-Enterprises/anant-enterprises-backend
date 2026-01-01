/**
 * Orders Interfaces
 *
 * Canonical TypeScript interfaces for order-related data.
 */

// ============================================
// ORDER
// ============================================

export interface IOrder {
    id: string; // UUID
    order_number: string;
    user_id?: number | null;
    cart_id?: string | null; // UUID
    channel: 'web' | 'app' | 'pos' | 'marketplace' | 'other';
    is_draft: boolean;
    payment_method?: string | null;
    payment_status: 'pending' | 'authorized' | 'partially_paid' | 'paid' | 'refunded' | 'failed' | 'partially_refunded';
    payment_ref?: string | null;
    transaction_id?: string | null;
    paid_at?: Date | null;
    currency: string;
    subtotal: string; // Decimal
    discount_type: 'percent' | 'amount' | 'none';
    discount_value: string; // Decimal
    discount_amount: string; // Decimal
    discount_code?: string | null;
    giftcard_code?: string | null;
    giftcard_amount: string; // Decimal
    shipping_method?: string | null;
    shipping_option?: string | null;
    shipping_amount: string; // Decimal
    partial_cod_charges: string; // Decimal
    advance_paid_amount: string; // Decimal
    cod_due_amount: string; // Decimal
    tax_amount: string; // Decimal
    cgst: string; // Decimal
    sgst: string; // Decimal
    igst: string; // Decimal
    total_amount: string; // Decimal
    total_quantity: number;
    fulfillment_status: 'unfulfilled' | 'partial' | 'fulfilled' | 'returned' | 'cancelled';
    fulfillment_date?: Date | null;
    delivery_date?: Date | null;
    return_date?: Date | null;
    order_tracking?: string | null;
    customer_gstin?: string | null;
    is_international_order: boolean;
    tags?: any[]; // JSONB
    customer_note?: string | null;
    admin_comment?: string | null;
    amz_order_id?: string | null;
    created_at: Date;
    created_by?: number | null;
    updated_at: Date;
    updated_by?: number | null;
    is_deleted: boolean;
    deleted_at?: Date | null;
    deleted_by?: number | null;
}

// ============================================
// ORDER ITEM
// ============================================

export interface IOrderItem {
    id: string; // UUID
    order_id: string; // UUID
    product_id?: string | null; // UUID
    sku?: string | null;
    product_name: string;
    product_image?: string | null;
    cost_price: string; // Decimal
    quantity: number;
    line_total: string; // Decimal
    created_at: Date;
    updated_at: Date;
}
