/**
 * Inventory Interfaces
 *
 * Canonical TypeScript interfaces for inventory-related data.
 */

// ============================================
// INVENTORY LOCATION
// ============================================

export interface IInventoryLocation {
    id: string; // UUID
    location_code: string;
    name: string;
    type: 'warehouse' | 'factory' | 'store' | 'transit';
    address?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    postal_code?: string | null;
    contact_person?: string | null;
    phone_number?: string | null;
    email?: string | null;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
    created_by?: number | null;
}

// ============================================
// INVENTORY
// ============================================

export interface IInventory {
    id: string; // UUID
    product_id: string; // UUID
    location_id: string; // UUID
    product_name: string;
    sku: string;
    required_quantity: number;
    available_quantity: number;
    shortage_quantity?: number; // Computed column
    status: 'Enough Stock' | 'Shortage' | 'In Production' | 'Low Stock';
    location?: string | null;
    last_counted_at?: Date | null;
    next_count_due?: Date | null;
    created_at: Date;
    updated_at: Date;
}

// ============================================
// INVENTORY ADJUSTMENT
// ============================================

export interface IInventoryAdjustment {
    id: string; // UUID
    inventory_id: string; // UUID
    adjustment_type: 'increase' | 'decrease' | 'correction' | 'write-off';
    quantity_change: number;
    reason: string;
    reference_number?: string | null;
    quantity_before: number;
    quantity_after: number;
    adjusted_by: number;
    adjusted_at: Date;
    approved_by?: number | null;
    approved_at?: Date | null;
    approval_status: 'pending' | 'approved' | 'rejected';
    notes?: string | null;
}

// ============================================
// PRODUCTION ORDER
// ============================================

export interface IProductionOrder {
    id: string; // UUID
    order_number: string;
    product_id: string; // UUID
    location_id?: string | null; // UUID
    quantity_ordered: number;
    quantity_completed: number;
    quantity_in_progress: number;
    quantity_rejected: number;
    status: 'pending' | 'in_progress' | 'completed' | 'delayed' | 'cancelled';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    scheduled_start_date?: string | null; // Date string
    scheduled_completion_date?: string | null; // Date string
    actual_start_date?: string | null; // Date string
    actual_completion_date?: string | null; // Date string
    completion_percentage: number;
    estimated_hours?: string | null; // Decimal
    actual_hours?: string | null; // Decimal
    assigned_to?: number | null;
    created_by: number;
    production_notes?: string | null;
    delay_reason?: string | null;
    created_at: Date;
    updated_at: Date;
}
