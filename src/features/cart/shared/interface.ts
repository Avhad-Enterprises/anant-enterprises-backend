/**
 * Cart Interfaces
 *
 * Canonical TypeScript interfaces for cart-related data.
 */

// ============================================
// CUSTOMIZATION OPTION (JSONB Type)
// ============================================

export interface ICustomizationOption {
  option_id: string; // UUID of the customization option
  option_name: string; // e.g., "Frame Color", "Engraving Text"
  selected_value: string; // e.g., "Black", "John Doe"
  price_adjustment: string; // Decimal string - additional cost for this option
}

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
  applied_discount_codes?: string[]; // JSONB - Array of discount codes
  applied_giftcard_codes?: string[]; // JSONB - Array of giftcard codes
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
  customization_data?: ICustomizationOption[]; // JSONB - Typed array of customization options
  created_at: Date;
  updated_at: Date;
  is_deleted: boolean;
  deleted_at?: Date | null;
}
