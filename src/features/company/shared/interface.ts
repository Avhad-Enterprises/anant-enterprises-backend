/**
 * Company Interfaces
 *
 * Canonical TypeScript interfaces for company data.
 */

// ============================================
// COMPANY
// ============================================

export interface ICompany {
  id: string; // UUID
  name: string;

  contact_email?: string | null;
  contact_phone?: string | null;

  gst_number?: string | null;
  pan_number?: string | null;

  address?: string | null;
  company_type?: string | null;

  user_assignment_type: 'manual' | 'automated';
  match_type?: 'all' | 'any' | null;

  status: boolean;

  created_at: Date;
  updated_at: Date;
}

// ============================================
// COMPANY RULE
// ============================================

export interface ICompanyRule {
  id: string; // UUID
  company_id: string;
  field: string;
  operator: string;
  value: string;
}
