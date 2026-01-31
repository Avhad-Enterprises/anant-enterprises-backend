/**
 * Bundles Interfaces
 *
 * Canonical TypeScript interfaces for bundle-related data.
 */

// ============================================
// BUNDLE (The Container)
// ============================================

export interface IBundle {
  id: string; // UUID
  title: string;
  description?: string | null;
  image_url?: string | null;
  type: 'fixed_price' | 'percentage_discount';
  status: 'draft' | 'active' | 'inactive' | 'archived';
  price_value?: string | null; // Decimal string
  starts_at?: Date | null;
  ends_at?: Date | null;
  created_by?: number | null;
  created_at: Date;
  updated_at: Date;
  is_deleted: boolean;
}

// ============================================
// BUNDLE ITEM (The Component)
// ============================================

export interface IBundleItem {
  id: string; // UUID
  bundle_id: string; // UUID
  product_id: string; // UUID
  quantity: number;
  is_optional: boolean;
  min_select?: number | null;
  max_select?: number | null;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}
