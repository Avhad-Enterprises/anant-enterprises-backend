/**
 * FAQ Interfaces
 *
 * Canonical TypeScript interfaces for FAQ data.
 */

// ============================================
// FAQ
// ============================================

export interface IFaq {
  id: string; // UUID
  question: string;
  answer: string;

  target_type: 'general' | 'product' | 'tier';
  product_id?: string | null;
  tier_id?: string | null;

  section?: string | null;
  position: number;
  status: boolean;

  created_at: Date;
  updated_at: Date;
}
