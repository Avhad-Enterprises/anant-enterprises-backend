/**
 * Tier Interfaces
 *
 * Canonical TypeScript interfaces for category/tier data.
 */

// ============================================
// TIER
// ============================================

export interface ITier {
  id: string; // UUID
  name: string;
  code: string;
  description?: string | null;

  level: number;
  parent_id?: string | null;

  status: 'active' | 'inactive';
  usage_count: number;

  created_at: Date;
  updated_at: Date;
}

// ============================================
// PRODUCT TIER LINK
// ============================================

export interface IProductTier {
  product_id: string;
  tier_id: string;
  is_primary: boolean;
}
