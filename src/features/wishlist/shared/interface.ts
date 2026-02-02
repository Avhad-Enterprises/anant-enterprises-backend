/**
 * Wishlist Interfaces
 *
 * Canonical TypeScript interfaces for wishlist data.
 */

// ============================================
// WISHLIST
// ============================================

export interface IWishlist {
  id: string; // UUID
  user_id: string;
  access_token: string | null;
  status: boolean;

  created_at: Date;
  updated_at: Date;
}

// ============================================
// WISHLIST ITEM
// ============================================

export interface IWishlistItem {
  wishlist_id: string;
  product_id: string;
  added_at: Date;
}

// ============================================
// API RESPONSES
// ============================================

export interface IWishlistItemResponse {
  product_id: string;
  product_name: string;
  product_image: string | null;
  selling_price: string;
  compare_at_price: string | null;
  sku: string;
  inStock: boolean;
  availableStock: number;
  notes: string | null;
  added_at: Date;
  added_to_cart_at: Date | null;
  purchased_at: Date | null;
  rating: number;
  reviews: number;
}

export interface IWishlistResponse {
  id: string | null;
  access_token: string | null;
  items: IWishlistItemResponse[];
  itemCount: number;
}
