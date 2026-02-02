/**
 * Address Interfaces
 *
 * TypeScript interfaces for address-related types.
 */

// ============================================
// USER ADDRESS
// ============================================

export interface IUserAddress {
  id: string; // UUID
  user_id: string;
  address_type: 'billing' | 'shipping' | 'both' | 'company' | 'other';
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
// DTOs (Data Transfer Objects)
// ============================================

/**
 * DTO for updating user address
 * Used in PUT /api/users/:userId/addresses/:id
 */
export interface IAddressUpdateInput {
  address_type?: 'billing' | 'shipping' | 'both' | 'company' | 'other';
  recipient_name?: string;
  company_name?: string;
  phone_number?: string;
  phone_country_code?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state_province?: string;
  postal_code?: string;
  country?: string;
  country_code?: string;
  latitude?: string;
  longitude?: string;
  delivery_instructions?: string;
  is_international?: boolean;
  tax_id?: string;
  is_default?: boolean;
}

/**
 * DTO for creating user address
 * Used in POST /api/users/:userId/addresses
 */
export interface IAddressCreateInput {
  address_type: 'billing' | 'shipping' | 'both' | 'company' | 'other';
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
  is_international?: boolean;
  tax_id?: string;
  is_default?: boolean;
}

// ============================================
// USER PAYMENT METHOD
// ============================================

export interface IUserPaymentMethod {
  id: string; // UUID
  user_id: string;
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
