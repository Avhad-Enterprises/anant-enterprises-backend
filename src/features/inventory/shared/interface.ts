/**
 * Inventory Interfaces
 *
 * TypeScript interfaces for inventory-related types.
 */

import type { Inventory, NewInventory } from './inventory.schema';
import type { InventoryAdjustment, NewInventoryAdjustment } from './inventory-adjustments.schema';

// Re-export schema types
export type { Inventory, NewInventory, InventoryAdjustment, NewInventoryAdjustment };

// ============================================
// API Request/Response Types
// ============================================

export interface InventoryListParams {
  page?: number;
  limit?: number;
  search?: string;
  condition?: string;
  status?: string;
  location?: string;
}

export interface InventoryListResponse {
  items: InventoryWithProduct[];
  total: number;
  page: number;
  limit: number;
}

export interface InventoryWithProduct {
  id: string;
  product_id: string;
  product_name: string;
  sku: string;
  thumbnail?: string;
  category?: string;
  brand?: string;
  available_quantity: number;
  reserved_quantity: number;
  incoming_quantity: number;
  incoming_po_reference?: string;
  incoming_eta?: Date;
  condition: 'sellable' | 'damaged' | 'quarantined' | 'expired';
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  location_id: string; // Changed from location?: string
  updated_by?: string;
  updated_by_name?: string;
  created_at: Date;
  updated_at: Date;
  type?: 'Base' | 'Variant';
}

export interface AdjustInventoryDto {
  quantity_change: number; // Positive or negative
  reason: string;
  reference_number?: string;
  notes?: string;
}

export interface UpdateInventoryDto {
  condition?: 'sellable' | 'damaged' | 'quarantined' | 'expired';
  location?: string;
  incoming_quantity?: number;
  incoming_po_reference?: string;
  incoming_eta?: string;
}

export interface InventoryHistoryItem {
  id: string;
  adjustment_type: 'increase' | 'decrease' | 'correction' | 'write-off';
  quantity_change: number;
  reason: string;
  reference_number?: string;
  quantity_before: number;
  quantity_after: number;
  adjusted_by: string;
  adjusted_by_name?: string;
  adjusted_at: Date;
  notes?: string;
  target_name?: string; // "Base Product" or Variant Name
  variant_sku?: string | null;
}

// ============================================
// Order-Inventory Integration Types
// ============================================

export interface ReserveStockDto {
  product_id: string;
  quantity: number;
}

export interface StockValidationResult {
  available: boolean;
  product_id: string;
  requested_quantity: number;
  available_quantity: number;
  reserved_quantity: number;
  product_name?: string;
  message?: string;
}
