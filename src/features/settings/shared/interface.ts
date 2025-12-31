/**
 * Settings Feature Interfaces
 */

// ============================================
// CURRENCY
// ============================================

export interface ICurrency {
  id: number;
  code: string;
  name: string;
  symbol: string;
  symbol_position: string;
  decimal_places: number;
  decimal_separator: string;
  thousands_separator: string;
  is_base_currency: boolean;
  use_real_time_rates: boolean;
  exchange_rate: string;
  manual_exchange_rate?: string;
  rate_last_updated_at?: Date;
  is_active: boolean;
  display_order: number;
  created_by?: number;
  updated_by?: number;
  created_at: Date;
  updated_at: Date;
}

// ============================================
// TAX RULE
// ============================================

export interface ITaxRule {
  id: number;
  country_code: string;
  region_code?: string;
  postal_code_pattern?: string;
  tax_name: string;
  tax_code?: string;
  tax_rate: string;
  tax_type: 'inclusive' | 'exclusive';
  applies_to: 'all' | 'physical_goods' | 'digital_goods' | 'services' | 'shipping';
  is_compound: boolean;
  priority: number;
  effective_from: string;
  effective_until?: string;
  is_active: boolean;
  description?: string;
  created_by?: number;
  updated_by?: number;
  created_at: Date;
  updated_at: Date;
}

// ============================================
// COUNTRY
// ============================================

export interface ICountry {
  id: number;
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
  id: number;
  country_code: string;
  code: string;
  name: string;
  has_special_tax: boolean;
  is_active: boolean;
}
