/**
 * Discount Interfaces
 *
 * Canonical TypeScript interfaces for discount data.
 * These interfaces provide a cleaner API layer abstraction over the database types.
 */

// ============================================
// ENUMS / TYPES
// ============================================

export type DiscountType = 'percentage' | 'fixed_amount' | 'free_shipping' | 'buy_x_get_y';
export type DiscountStatus = 'active' | 'inactive' | 'draft' | 'scheduled' | 'expired';
export type MinRequirementType = 'none' | 'min_amount' | 'min_quantity';
export type AppliesTo = 'entire_order' | 'specific_products' | 'specific_collections';
export type BuyXTriggerType = 'quantity' | 'amount';
export type GetYType = 'free' | 'percentage' | 'amount' | 'fixed_price';
export type GetYAppliesTo = 'same' | 'specific_products' | 'specific_collections' | 'cheapest';
export type ShippingScope = 'all' | 'specific_methods' | 'specific_zones';
export type TargetAudience = 'all' | 'specific_customers' | 'segments';
export type GeoRestriction = 'none' | 'specific_regions';

// ============================================
// DISCOUNT (Core)
// ============================================

export interface IDiscount {
  id: string;
  title: string;
  description?: string | null;

  // Core Logic
  type: DiscountType;
  value: string | null;
  max_discount_amount?: string | null;

  // Applies To
  applies_to: AppliesTo;

  // Minimum Requirements
  min_requirement_type: MinRequirementType;
  min_requirement_value: string | null;

  // Buy X Get Y
  buy_x_trigger_type?: BuyXTriggerType | null;
  buy_x_value?: string | null;
  buy_x_applies_to?: AppliesTo | null;
  buy_x_same_product?: boolean;
  buy_x_repeat?: boolean;
  get_y_type?: GetYType | null;
  get_y_applies_to?: GetYAppliesTo | null;
  get_y_quantity?: number | null;
  get_y_value?: string | null;
  get_y_max_rewards?: number | null;

  // Free Shipping
  shipping_scope?: ShippingScope | null;
  shipping_min_amount?: string | null;
  shipping_min_items?: number | null;
  shipping_cap?: string | null;

  // Targeting
  target_audience: TargetAudience;
  geo_restriction: GeoRestriction;

  // Usage Limits
  usage_limit: number | null;
  usage_per_customer?: number | null;
  usage_per_day?: number | null;
  usage_per_order?: number | null;
  once_per_customer: boolean;
  limit_new_customers: boolean;
  limit_returning_customers: boolean;

  // Schedule
  starts_at: Date;
  ends_at: Date | null;

  // Status & Statistics
  status: DiscountStatus;
  total_usage_count: number;
  total_discount_amount: string;
  total_orders_count: number;

  // Metadata
  tags: string[];
  admin_comment?: string | null;

  // Audit
  is_deleted: boolean;
  created_by?: string | null;
  created_at: Date;
  updated_at: Date;
}

// ============================================
// DISCOUNT CODE
// ============================================

export interface IDiscountCode {
  code: string;
  discount_id: string;
  usage_limit: number | null;
  usage_count: number;
  max_uses_per_customer?: number | null;
  allowed_user_ids?: string[];
  allowed_email_domains?: string[];
  required_customer_tags?: string[];
}

// ============================================
// DISCOUNT WITH RELATIONS (For detailed responses)
// ============================================

export interface IDiscountWithRelations extends IDiscount {
  codes?: IDiscountCode[];
  products?: { product_id: string }[];
  collections?: { collection_id: string }[];
  customers?: { user_id: string }[];
  segments?: { segment_id: string }[];
  regions?: { country_code: string; region_code?: string | null }[];
  exclusions?: { exclusion_type: string; exclusion_value: string }[];
  buy_x_products?: { product_id: string }[];
  buy_x_collections?: { collection_id: string }[];
  get_y_products?: { product_id: string }[];
  get_y_collections?: { collection_id: string }[];
  shipping_methods?: { shipping_method_id: string }[];
  shipping_zones?: { shipping_zone_id: string }[];
}

// ============================================
// DISCOUNT USAGE
// ============================================

export interface IDiscountUsage {
  id: string;
  discount_id: string | null;
  discount_code: string | null;
  user_id: string | null;
  guest_email?: string | null;
  order_id: string | null;
  order_number?: string | null;
  discount_type: string;
  discount_value?: string | null;
  discount_amount: string;
  order_subtotal?: string | null;
  order_total?: string | null;
  items_count?: number | null;
  used_at: Date;
}

// ============================================
// API REQUEST/RESPONSE INTERFACES
// ============================================

export interface IDiscountListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: DiscountStatus;
  type?: DiscountType;
  sort?: 'newest' | 'oldest' | 'usage_desc' | 'usage_asc' | 'title_asc' | 'title_desc';
}

export interface IDiscountListResponse {
  data: IDiscount[];
  meta: {
    total: number;
    page: number;
    limit: number;
    last_page: number;
  };
}

export interface IDiscountStats {
  redemptions: number;
  total_amount: string;
  orders_count: number;
  average_discount: string;
  top_products?: { product_id: string; product_name: string; usage_count: number }[];
  usage_by_date?: { date: string; count: number; amount: string }[];
}

export interface IValidateDiscountRequest {
  code: string;
  cart_id?: string;
  user_id?: string;
  shipping_address_id?: string;
  payment_method?: string;
}

export interface IValidateDiscountResponse {
  valid: boolean;
  discount?: IDiscount;
  savings?: string;
  error_code?: string;
  message?: string;
}

export interface IApplyDiscountRequest {
  cart_id: string;
  discount_code: string;
}

export interface IApplyDiscountResponse {
  success: boolean;
  discount?: {
    code: string;
    type: DiscountType;
    savings: string;
  };
  error_code?: string;
  message?: string;
}
