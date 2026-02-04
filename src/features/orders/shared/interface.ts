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
  user_id?: string | null;
  cart_id?: string | null; // UUID

  // Address References (Added from schema)
  shipping_address_id?: string | null; // UUID
  billing_address_id?: string | null; // UUID

  channel: 'web' | 'app' | 'pos' | 'marketplace' | 'other';

  // Overall order status (Added from schema)
  order_status?:
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

  is_draft: boolean;
  payment_method?: string | null;
  payment_status:
  | 'pending'
  | 'paid'
  | 'refunded'
  | 'failed'
  | 'partially_refunded';
  payment_ref?: string | null;
  transaction_id?: string | null;
  paid_at?: Date | null;
  currency: string;
  subtotal: string; // Decimal

  // Discount References (Added from schema)
  discount_id?: string | null; // UUID
  discount_code_id?: string | null;

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

  // Tax Rule Reference (Added from schema)
  tax_rule_id?: string | null; // UUID

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
  tags?: string[]; // JSONB - Array of tag strings
  customer_note?: string | null;
  admin_comment?: string | null;
  amz_order_id?: string | null;
  created_at: Date;
  created_by?: string | null;
  updated_at: Date;
  updated_by?: string | null;
  is_deleted: boolean;
  deleted_at?: Date | null;
  deleted_by?: string | null;
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

// ============================================
// RESPONSE TYPES
// ============================================

/**
 * Order item summary for list responses
 * Used in order list endpoints to return minimal item details
 */
export interface IOrderItemSummary {
  id: string;
  product_name: string;
  product_image: string | null;
  quantity: number;
  cost_price: string;
  line_total: string;
}

/**
 * Order summary for list responses
 * Used in order list endpoints with paginated results
 */
export interface IOrderSummary {
  id: string;
  order_number: string;
  order_status: string;
  payment_status: string;
  total_amount: string;
  total_quantity: number;
  items_count: number;
  created_at: Date;
  items: IOrderItemSummary[];
}

/**
 * Order item response for user-facing endpoints
 * Simplified format optimized for frontend display
 */
export interface IOrderItemResponse {
  name: string;
  quantity: number;
  price: number;
  image: string;
}

/**
 * Order response for user-facing endpoints
 * Formatted for frontend consumption with human-readable dates
 */
export interface IOrderResponse {
  id: string;
  date: string;
  status: string;
  total: number;
  deliveryDate?: string;
  trackingNumber?: string;
  items: IOrderItemResponse[];
}
