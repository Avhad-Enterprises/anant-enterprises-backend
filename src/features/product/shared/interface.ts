/**
 * Product Interfaces
 *
 * Canonical TypeScript interfaces for product data.
 * These decouple logic from database implementation details.
 */

// ============================================
// PRODUCT (Database Entity)
// ============================================

export interface IProduct {
  id: string; // UUID
  slug: string;
  product_title: string;
  secondary_title?: string | null;

  short_description?: string | null;
  full_description?: string | null;

  status: 'draft' | 'active' | 'archived';
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

  category_tier_1?: string | null;
  category_tier_2?: string | null;
  category_tier_3?: string | null;
  category_tier_4?: string | null;

  // Tags
  tags?: string[]; // JSONB

  primary_image_url?: string | null;
  additional_images: string[]; // JSONB array

  meta_title?: string | null;
  meta_description?: string | null;
  product_url?: string | null;

  created_at: Date;
  updated_at: Date;
  created_by?: string | null;
  updated_by?: string | null;

  is_deleted: boolean;
  deleted_at?: Date | null;
  deleted_by?: string | null;

  // Variants Flag
  has_variants: boolean;
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

// ============================================
// PRODUCT VARIANT
// ============================================

/**
 * Product Variant interface
 * Represents a variant of a product with independent pricing and inventory.
 */
export interface IProductVariant {
  id: string;
  product_id: string;

  // Variant Attributes
  option_name: string;
  option_value: string;

  // Identification
  sku: string;
  barcode?: string | null;

  // Independent Pricing
  cost_price: string;
  selling_price: string;
  compare_at_price?: string | null;

  // Inventory
  inventory_quantity: number;

  // Media
  image_url?: string | null;
  thumbnail_url?: string | null;

  // Status
  is_default: boolean;
  is_active: boolean;

  // Timestamps
  created_at: Date;
  updated_at: Date;
  created_by?: string | null;
  updated_by?: string | null;

  // Soft Delete
  is_deleted: boolean;
  deleted_at?: Date | null;
  deleted_by?: string | null;
}

// ============================================
// PRODUCT DETAIL RESPONSE
// ============================================

export interface IProductDetailResponse {
  // Core product fields
  id: string;
  slug: string;
  product_title: string;
  secondary_title: string | null;
  short_description: string | null;
  full_description: string | null;
  status: string;

  // Pricing
  cost_price: string;
  selling_price: string;
  compare_at_price: string | null;
  discount: number | null;

  // Inventory
  sku: string;
  inStock: boolean;
  total_stock: number;
  base_inventory: number;

  // Media
  primary_image_url: string | null;
  additional_images: string[];
  images: string[];

  // Categorization
  category_tier_1: string | null;
  category_tier_2: string | null;
  category_tier_3: string | null;
  category_tier_4: string | null;

  // Reviews
  rating: number;
  review_count: number;

  // Timestamps
  created_at: Date;
  updated_at: Date;

  // Extended Fields
  weight: string | null;
  length: string | null;
  breadth: string | null;
  height: string | null;

  meta_title: string | null;
  meta_description: string | null;
  product_url: string | null;

  hsn_code: string | null;
  tags: string[];

  featured: boolean;
  faqs: Array<{ id: string; question: string; answer: string }>;

  // Variants
  has_variants: boolean;
  variants: IProductVariant[];
}

// ============================================
// COLLECTION PRODUCT (Storefront)
// ============================================

export interface ICollectionProduct {
  id: string;
  name: string;
  tags: string[] | null;
  rating: number;
  reviews: number;
  price: number;
  originalPrice: number | null;
  image: string | null;
  isNew: boolean;
  category: string;
  technologies: string[];
  description: string | null;
}

// Note: Removed storefront-specific interfaces (IComparisonProduct, IProductBundle,
// IBundleItemDetail, IFilterOption, IRatingOption, IPriceRange) as those APIs were removed.


// ============================================
// SEARCH
// ============================================

// No longer needed - search APIs removed

