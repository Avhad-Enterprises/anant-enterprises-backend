/**
 * Product Response DTOs
 *
 * TypeScript interfaces for API response shapes.
 * These represent transformed data sent to clients, separate from database entities.
 */

import { IProductVariant } from './interface';

// ============================================
// PRODUCT RESPONSE (Detail View)
// ============================================

/**
 * Detailed product response for single product views
 * Includes all product information with variants, FAQs, and inventory
 */
export interface IProductResponse {
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
  total_stock: number | undefined;  // undefined when no inventory tracking
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
// PRODUCT LIST ITEM (Collections/Lists)
// ============================================

/**
 * Simplified product response for list/collection views
 * Optimized for displaying multiple products with essential information
 */
export interface IProductListItem {
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
  inStock: boolean;
  total_stock: number | undefined;  // undefined when no inventory tracking
}
