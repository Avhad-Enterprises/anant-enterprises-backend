/**
 * Product Interfaces
 *
 * Canonical TypeScript interfaces for product data.
 * These decouple logic from database implementation details.
 */

// ============================================
// PRODUCT FEATURE (JSONB Type)
// ============================================

export interface IProductFeature {
  icon?: string; // Icon name or URL
  title: string; // e.g., "5 Year Warranty"
  description: string; // Detailed description of the feature
}

// ============================================
// PRODUCT SPECS (JSONB Type)
// ============================================

export interface IProductSpecs {
  [key: string]: string | number | boolean; // Flexible key-value specifications
  // Examples:
  // technology?: string; // "RO+UV+UF"
  // storage?: string; // "10L"
  // power?: string; // "60W"
  // warranty?: string; // "5 years"
}

// ============================================
// PRODUCT
// ============================================

export interface IProduct {
  id: string; // UUID
  slug: string;
  product_title: string;
  secondary_title?: string | null;

  short_description?: string | null;
  full_description?: string | null;

  status: 'draft' | 'active' | 'archived' | 'schedule';
  scheduled_publish_at?: Date | null;
  scheduled_publish_time?: string | null;
  is_delisted: boolean;
  delist_date?: Date | null;
  featured: boolean;

  cost_price: string; // Decimal string
  selling_price: string; // Decimal string
  compare_at_price?: string | null; // Decimal string

  sku: string;
  hsn_code?: string | null;

  weight?: string | null;
  length?: string | null;
  breadth?: string | null;
  height?: string | null;
  pickup_location?: string | null;

  category_tier_1?: string | null;
  category_tier_2?: string | null;
  category_tier_3?: string | null;
  category_tier_4?: string | null;

  size_group?: string | null;
  accessories_group?: string | null;

  // Brand information
  brand_name?: string | null;
  brand_slug?: string | null;

  // Product page enhancements (JSONB fields)
  tags?: string[]; // JSONB - Feature tags like ["RO", "UV", "UF"]
  highlights?: string[]; // JSONB - Bullet points like ["10L capacity", "5 year warranty"]
  features?: IProductFeature[]; // JSONB - Feature cards with icons and descriptions
  specs?: IProductSpecs | null; // JSONB - Technical specifications object

  primary_image_url?: string | null;
  additional_images: string[]; // JSONB array -> string[]

  meta_title?: string | null;
  meta_description?: string | null;
  product_url?: string | null;
  admin_comment?: string | null;

  is_limited_edition: boolean;
  is_preorder_enabled: boolean;
  preorder_release_date?: Date | null;
  is_gift_wrap_available: boolean;

  created_at: Date;
  updated_at: Date;
  created_by?: string | null;
  updated_by?: string | null;

  is_deleted: boolean;
  deleted_at?: Date | null;
  deleted_by?: string | null;
}

// ============================================
// PRODUCT FAQ
// ============================================

export interface IProductFaq {
  id: string; // UUID
  product_id: string;

  question: string;
  answer: string;

  created_at: Date;
  updated_at: Date;
}
