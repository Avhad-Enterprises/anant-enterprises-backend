/**
 * Blog Interfaces
 *
 * Canonical TypeScript interfaces for blog data.
 */

// ============================================
// BLOG
// ============================================

export interface IBlog {
  id: string; // UUID
  title: string;
  quote?: string | null;
  description?: string | null;
  content?: string | null;
  slug: string;

  main_image_pc_url?: string | null;
  main_image_mobile_url?: string | null;

  category?: string | null;
  tags: string[]; // JSONB Array
  author?: string | null;

  meta_title?: string | null;
  meta_description?: string | null;

  status: 'public' | 'private' | 'draft';
  published_at?: Date | null;
  views_count: number;
  admin_comment?: string | null;

  created_at: Date;
  updated_at: Date;
}

// ============================================
// BLOG SUBSECTION
// ============================================

export interface IBlogSubsection {
  id: string; // UUID
  blog_id: string;
  title?: string | null;
  description?: string | null;
  image_url?: string | null;
  sort_order: number;
}
