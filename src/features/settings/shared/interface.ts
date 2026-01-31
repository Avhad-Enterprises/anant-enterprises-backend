/**
 * Settings Feature Interfaces
 */

// ============================================
// CURRENCY
// ============================================

export interface ICurrency {
  id: string; // UUID
  code: string; // ISO 4217
  name: string;
  symbol: string;
  is_base_currency: boolean;
  use_real_time_rates: boolean;
  exchange_rate: string; // Decimal
  manual_exchange_rate?: string | null; // Decimal
  rate_last_updated_at?: Date | null;
  is_active: boolean;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: Date;
  updated_at: Date;
}

// ============================================
// TAX RULE
// ============================================

export interface ITaxRule {
  id: string; // UUID
  country_code: string; // ISO 3166-1 alpha-2
  region_code?: string | null;
  postal_code_pattern?: string | null;
  tax_name: string;
  tax_code?: string | null;
  tax_rate: string; // Decimal
  tax_type: 'inclusive' | 'exclusive';
  applies_to: 'all' | 'physical_goods' | 'digital_goods' | 'services' | 'shipping';
  is_compound: boolean;
  priority: number;
  effective_from: string; // Date string
  effective_until?: string | null; // Date string
  is_active: boolean;
  description?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: Date;
  updated_at: Date;
}

// ============================================
// COUNTRY
// ============================================

export interface ICountry {
  id: string; // UUID
  code: string;
  code_alpha3: string;
  name: string;
  native_name?: string;
  phone_code?: string;
  currency_code?: string;
  is_shipping_enabled: boolean;
  is_billing_enabled: boolean;
  requires_state: boolean;
  display_order: number;
  is_active: boolean;
}

// ============================================
// REGION
// ============================================

export interface IRegion {
  id: string; // UUID
  country_code: string;
  code: string;
  name: string;
  has_special_tax: boolean;
  is_active: boolean;
}

// ============================================
// SHIPPING SETTINGS
// ============================================

export interface IShippingSettings {
  id: string; // UUID
  default_shipping_method?: string | null;
  free_shipping_min_amount?: string | null; // Decimal
  created_at: Date;
  updated_at: Date;
}
