/**
 * Catalogue Interfaces
 *
 * Canonical TypeScript interfaces for catalogue data.
 */

// ============================================
// CATALOGUE
// ============================================

export interface ICatalogue {
    id: string; // UUID
    name: string;
    description: string | null;

    status: 'active' | 'inactive' | 'draft';
    priority: number;

    valid_from: Date;
    valid_to: Date | null;

    assigned_segments: string[]; // JSONB - Array of Segment IDs
    assigned_roles: string[]; // JSONB - Array of Role IDs
    assigned_channels: string[]; // JSONB - e.g. ['pos', 'b2b']

    tier_level: string | null;
    tier_value: string | null;
    rule_match_type: 'all' | 'any';

    created_at: Date;
    updated_at: Date;
}

// ============================================
// CATALOGUE RULE
// ============================================

export interface ICatalogueRule {
    id: string; // UUID
    catalogue_id: string;
    field: string;
    operator: string;
    value: string;
}

// ============================================
// CATALOGUE OVERRIDE
// ============================================

export interface ICatalogueOverride {
    catalogue_id: string;
    product_id: string;

    adjustment_type: 'fixed_price' | 'percentage_discount' | 'percentage_markup' | 'fixed_discount' | null;
    adjustment_value: string | null; // Decimal

    min_quantity: number | null;
    max_quantity: number | null;
    increment_step: number | null;

    is_excluded: boolean;
}
