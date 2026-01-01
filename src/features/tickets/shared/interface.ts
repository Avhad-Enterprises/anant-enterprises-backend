/**
 * Tickets Interfaces
 *
 * Canonical TypeScript interfaces for ticket-related data.
 */

// ============================================
// TICKET
// ============================================

export interface ITicket {
    id: string; // UUID
    ticket_number: string;
    customer_id?: number | null;
    order_id?: string | null; // UUID
    assigned_to?: number | null;
    subject: string;
    category: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    status: 'open' | 'pending' | 'waiting_customer' | 'resolved' | 'closed';
    channel: 'email' | 'chat' | 'whatsapp' | 'phone' | 'system';
    created_via: 'store' | 'email' | 'admin' | 'api';
    tags?: any[]; // JSONB
    notes?: string | null;
    metadata?: any; // JSONB
    last_message_at: Date;
    first_response_at?: Date | null;
    resolved_at?: Date | null;
    satisfaction_rating?: number | null;
    satisfaction_comment?: string | null;
    is_active: boolean;
    created_at: Date;
    created_by: number;
    updated_at: Date;
    updated_by?: number | null;
    is_deleted: boolean;
    deleted_at?: Date | null;
    deleted_by?: number | null;
}

// ============================================
// TICKET MESSAGE
// ============================================

export interface ITicketMessage {
    id: string; // UUID
    ticket_id: string; // UUID
    sender_type: 'customer' | 'agent' | 'system' | 'note';
    sender_id?: number | null;
    message: string;
    attachments?: any[]; // JSONB
    is_internal: boolean;
    created_at: Date;
    created_by: number;
    updated_at: Date;
    updated_by?: number | null;
    is_deleted: boolean;
    deleted_at?: Date | null;
    deleted_by?: number | null;
}
