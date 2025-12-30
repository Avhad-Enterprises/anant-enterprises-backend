/**
 * User Interfaces
 *
 * TypeScript interfaces for user-related types.
 * These are the canonical types for application code.
 */

// ============================================
// USER
// ============================================

export interface IUser {
  id: number;
  auth_id?: string;
  user_type: 'individual' | 'business';
  name: string;
  email: string;
  password?: string;
  phone_number?: string;
  phone_country_code?: string;
  phone_verified: boolean;
  phone_verified_at?: Date;
  profile_image_url?: string;
  date_of_birth?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  preferred_language: string;
  preferred_currency: string;
  timezone: string;
  created_by?: number;
  created_at: Date;
  updated_by?: number;
  updated_at: Date;
  is_deleted: boolean;
  deleted_by?: number;
  deleted_at?: Date;
}

// ============================================
// USER ADDRESS
// ============================================

export interface IUserAddress {
  id: number;
  user_id: number;
  address_type: 'billing' | 'shipping' | 'both' | 'company';
  is_default: boolean;
  recipient_name: string;
  company_name?: string;
  phone_number?: string;
  phone_country_code?: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state_province: string;
  postal_code: string;
  country: string;
  country_code: string;
  latitude?: string;
  longitude?: string;
  delivery_instructions?: string;
  is_international: boolean;
  tax_id?: string;
  created_at: Date;
  updated_at: Date;
  is_deleted: boolean;
}

// ============================================
// USER PAYMENT METHOD
// ============================================

export interface IUserPaymentMethod {
  id: number;
  user_id: number;
  payment_type: 'card' | 'upi' | 'netbanking' | 'wallet';
  is_default: boolean;
  razorpay_customer_id?: string;
  razorpay_token_id?: string;
  display_name?: string;
  card_last4?: string;
  card_brand?: string;
  card_network?: string;
  card_type?: 'credit' | 'debit' | 'prepaid';
  card_issuer?: string;
  card_exp_month?: number;
  card_exp_year?: number;
  upi_id?: string;
  wallet_type?: string;
  netbanking_bank_code?: string;
  netbanking_bank_name?: string;
  billing_address_id?: number;
  is_verified: boolean;
  verified_at?: Date;
  last_used_at?: Date;
  created_at: Date;
  updated_at: Date;
  is_deleted: boolean;
}

// ============================================
// CUSTOMER PROFILE
// ============================================

export interface ICustomerProfile {
  id: number;
  user_id: number;
  segment: 'new' | 'regular' | 'vip' | 'at_risk';
  store_credit_balance: string;
  referral_code?: string;
  referred_by_user_id?: number;
  referral_bonus_credited: boolean;
  marketing_opt_in: boolean;
  sms_opt_in: boolean;
  email_opt_in: boolean;
  whatsapp_opt_in: boolean;
  push_notifications_opt_in: boolean;
  account_status: 'active' | 'suspended' | 'closed';
  suspended_reason?: string;
  suspended_until?: Date;
  created_at: Date;
  updated_at: Date;
}

// ============================================
// BUSINESS CUSTOMER PROFILE
// ============================================

export interface IBusinessCustomerProfile {
  id: number;
  user_id: number;
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
  billing_address_id?: number;
  shipping_address_id?: number;
  payment_terms: 'immediate' | 'net_15' | 'net_30' | 'net_60' | 'net_90';
  credit_limit: string;
  credit_used: string;
  credit_approved_by?: number;
  credit_approved_at?: Date;
  account_manager_id?: number;
  tier: 'standard' | 'silver' | 'gold' | 'platinum';
  bulk_discount_percent: string;
  minimum_order_value?: string;

  account_status: 'pending' | 'active' | 'suspended' | 'closed';
  approved_by?: number;
  approved_at?: Date;
  suspended_reason?: string;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

// ============================================
// ADMIN PROFILE
// ============================================

export interface IAdminProfile {
  id: number;
  user_id: number;
  employee_id?: string;
  department?: string;
  job_title?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  is_deleted: boolean;
}

// ============================================
// VENDOR
// ============================================

export interface IVendor {
  id: number;
  vendor_code: string;
  company_name: string;
  legal_name?: string;
  registration_number?: string;
  vendor_type: 'manufacturer' | 'distributor' | 'wholesaler' | 'dropshipper' | 'service_provider';
  tax_id?: string;
  primary_contact_name: string;
  primary_contact_email: string;
  primary_contact_phone?: string;
  primary_contact_phone_country_code?: string;
  secondary_contact_name?: string;
  secondary_contact_email?: string;
  secondary_contact_phone?: string;
  website?: string;
  business_address?: string;
  country: string;
  country_code: string;
  payment_terms?: string;
  payment_method_preference?: string;
  currency: string;
  bank_name?: string;
  bank_account_last4?: string;
  bank_swift_code?: string;
  is_preferred: boolean;
  quality_rating?: string;
  delivery_rating?: string;
  communication_rating?: string;
  overall_rating?: string;
  products_category?: string;
  lead_time_days?: number;
  minimum_order_quantity?: number;
  minimum_order_value?: string;
  contract_start_date?: string;
  contract_end_date?: string;
  contract_document_url?: string;
  notes?: string;
  is_active: boolean;
  created_by?: number;
  updated_by?: number;
  created_at: Date;
  updated_at: Date;
  is_deleted: boolean;
}

// ============================================
// CUSTOMER STATISTICS
// ============================================

export interface ICustomerStatistics {
  id: number;
  user_id: number;
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
