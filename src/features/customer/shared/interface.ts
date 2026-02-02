/**
 * Customer Profile Interfaces
 *
 * TypeScript interfaces for customer-related types.
 */

// ============================================
// CUSTOMER PROFILE (B2C)
// ============================================

export interface ICustomerProfile {
  id: string; // UUID
  user_id: string;
  segment: 'new' | 'regular' | 'vip' | 'at_risk';
  store_credit_balance: string;
  referral_code?: string;
  referred_by_user_id?: string;
  marketing_opt_in: boolean;
  sms_opt_in: boolean;
  email_opt_in: boolean;
  whatsapp_opt_in: boolean;
  push_notifications_opt_in: boolean;
  account_status: 'active' | 'inactive' | 'banned';
  banned_reason?: string;
  banned_until?: Date; // NULL = permanent ban, timestamp = temporary ban
  risk_profile?: string;
  loyalty_enrolled: boolean;
  loyalty_tier?: string;
  loyalty_points?: string;
  loyalty_enrollment_date?: Date;
  subscription_plan?: string;
  subscription_status?: string;
  billing_cycle?: string;
  subscription_start_date?: Date;
  auto_renew?: boolean;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

// ============================================
// BUSINESS CUSTOMER PROFILE (B2B)
// ============================================

export interface IBusinessCustomerProfile {
  id: string; // UUID
  user_id: string;
  business_type: 'sole_proprietor' | 'partnership' | 'llc' | 'corporation' | 'nonprofit';
  company_legal_name: string;
  company_trade_name?: string;
  company_registration_number?: string;
  industry?: string;
  website?: string;
  tax_id?: string;
  tax_exempt: boolean;
  tax_exemption_certificate_url?: string;
  business_email: string;
  business_phone?: string;
  business_phone_country_code?: string;
  billing_address_id?: string; // UUID
  shipping_address_id?: string; // UUID
  payment_terms: 'immediate' | 'net_15' | 'net_30' | 'net_60' | 'net_90';
  credit_limit: string;
  credit_approved_by?: string;
  credit_approved_at?: Date;
  account_manager_id?: string;
  tier: 'standard' | 'silver' | 'gold' | 'platinum';
  bulk_discount_percent: string;
  minimum_order_value?: string;
  account_status: 'pending' | 'active' | 'inactive' | 'banned';
  approved_by?: string;
  approved_at?: Date;
  banned_reason?: string;
  banned_until?: Date; // NULL = permanent ban, timestamp = temporary ban
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

// ============================================
// CUSTOMER STATISTICS
// ============================================

export interface ICustomerStatistics {
  id: string; // UUID
  user_id: string;
  total_orders: number;
  completed_orders: number;
  cancelled_orders: number;
  returned_orders: number;
  total_spent: string;
  average_order_value: string;
  highest_order_value?: string;
  first_order_at?: Date;
  last_order_at?: Date;
  days_since_last_order?: number;
  favorite_category_id?: number;
  favorite_brand_id?: number;
  cart_abandonment_count: number;
  wishlist_items_count: number;
  support_tickets_count: number;
  reviews_count: number;
  average_review_rating?: string;
  updated_at: Date;
}
