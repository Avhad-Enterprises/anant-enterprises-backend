/**
 * Tier Sanitization
 *
 * Functions to sanitize tier data for API responses.
 * Removes sensitive/internal fields before sending to clients.
 */

import { Tier } from './tiers.schema';

/**
 * Sanitized tier response (public-facing)
 */
export interface SanitizedTier {
    id: string;
    name: string;
    code: string;
    description: string | null;
    level: number;
    parent_id: string | null;
    priority: number;
    status: 'active' | 'inactive';
    usage_count: number;
    created_at: Date;
    updated_at: Date;
}

/**
 * Sanitize a single tier for API response
 * Removes: created_by, updated_by, deleted_by, deleted_at, is_deleted
 */
export function sanitizeTier(tier: Tier): SanitizedTier {
    return {
        id: tier.id,
        name: tier.name,
        code: tier.code,
        description: tier.description,
        level: tier.level,
        parent_id: tier.parent_id,
        priority: tier.priority,
        status: tier.status,
        usage_count: tier.usage_count,
        created_at: tier.created_at,
        updated_at: tier.updated_at,
    };
}

/**
 * Sanitize an array of tiers
 */
export function sanitizeTiers(tiers: Tier[]): SanitizedTier[] {
    return tiers.map(sanitizeTier);
}

/**
 * Sanitize tier with parent information
 */
export interface SanitizedTierWithParent extends SanitizedTier {
    parent?: SanitizedTier;
}

export function sanitizeTierWithParent(
    tier: Tier,
    parent: Tier | null
): SanitizedTierWithParent {
    const sanitized = sanitizeTier(tier);
    
    if (parent) {
        return {
            ...sanitized,
            parent: sanitizeTier(parent),
        };
    }
    
    return sanitized;
}

/**
 * Sanitize tier hierarchy (recursive structure)
 */
export interface SanitizedTierHierarchy extends SanitizedTier {
    children: SanitizedTierHierarchy[];
}

export function sanitizeTierHierarchy(
    tier: Tier,
    children: Tier[] = []
): SanitizedTierHierarchy {
    return {
        ...sanitizeTier(tier),
        children: children.map(child => sanitizeTierHierarchy(child, [])),
    };
}

/**
 * Minimal tier info (for dropdown/select components)
 */
export interface MinimalTier {
    id: string;
    name: string;
    code: string;
    level: number;
}

export function toMinimalTier(tier: Tier): MinimalTier {
    return {
        id: tier.id,
        name: tier.name,
        code: tier.code,
        level: tier.level,
    };
}

export function toMinimalTiers(tiers: Tier[]): MinimalTier[] {
    return tiers.map(toMinimalTier);
}
