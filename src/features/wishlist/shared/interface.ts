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
