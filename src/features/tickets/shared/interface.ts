/**
 * Tickets Interfaces
 *
 * Canonical TypeScript interfaces for ticket-related data.
 */

// ============================================
// ATTACHMENT (JSONB Type)
// ============================================

export interface IAttachment {
  file_url: string;
  type: 'image' | 'pdf' | 'document' | 'other';
  filename?: string;
}

// ============================================
// TICKET METADATA (JSONB Type)
// ============================================

export interface ITicketMetadata {
  browser?: string; // e.g., "Chrome 120.0.0"
  os?: string; // e.g., "macOS 14.0"
  device?: string; // e.g., "Desktop", "Mobile", "Tablet"
  ip_address?: string; // IP address for audit trail
  user_agent?: string; // Full user agent string
  referrer?: string; // Referring URL
  language?: string; // Browser language
  screen_resolution?: string; // e.g., "1920x1080"
  timezone?: string; // e.g., "Asia/Kolkata"
  [key: string]: unknown; // Allow additional metadata
}

// ============================================
// TICKET
// ============================================

// ============================================
// TICKET
// ============================================

export interface ITicket {
  id: string; // UUID
  ticket_number: string;
  customer_id?: string | null;
  order_id?: string | null; // UUID
  assigned_to?: string | null;
  subject: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'pending' | 'waiting_customer' | 'resolved' | 'closed';
  channel: 'email' | 'chat' | 'whatsapp' | 'phone' | 'system';
  created_via: 'store' | 'email' | 'admin' | 'api';
  tags?: string[]; // JSONB - Array of tag strings, e.g. ["refund","VIP"]
  notes?: string | null;
  metadata?: ITicketMetadata | null; // JSONB - Structured metadata object
  last_message_at: Date;
  first_response_at?: Date | null;
  resolved_at?: Date | null;
  satisfaction_rating?: number | null;
  satisfaction_comment?: string | null;
  is_active: boolean;
  created_at: Date;
  created_by: string;
  updated_at: Date;
  updated_by?: string | null;
  is_deleted: boolean;
  deleted_at?: Date | null;
  deleted_by?: string | null;
}

// ============================================
// TICKET MESSAGE
// ============================================

export interface ITicketMessage {
  id: string; // UUID
  ticket_id: string; // UUID
  sender_type: 'customer' | 'agent' | 'system' | 'note';
  sender_id?: string | null;
  message: string;
  attachments?: IAttachment[] | null; // JSONB - Array of attachment objects
  is_internal: boolean;
  created_at: Date;
  created_by: string;
  updated_at: Date;
  updated_by?: string | null;
  is_deleted: boolean;
  deleted_at?: Date | null;
  deleted_by?: string | null;
}
