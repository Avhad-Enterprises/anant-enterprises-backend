-- Migration: Drop unused tables (Phase 1 - Safe removals)
-- Date: January 31, 2026
-- Description: Remove 6 tables that are defined in schema but have no API routes or usage

-- Drop tables with no dependencies (safe to remove)
DROP TABLE IF EXISTS public.location_allocation_rules;
DROP TABLE IF EXISTS public.collection_rules;
DROP TABLE IF EXISTS public.discount_daily_usage;
DROP TABLE IF EXISTS public.discount_exclusions;
DROP TABLE IF EXISTS public.discount_segments;
DROP TABLE IF EXISTS public.sessions;

-- Note: These tables were identified as unused through codebase analysis:
-- 1. location_allocation_rules - No API routes, only schema definition
-- 2. collection_rules - Automated collections not implemented
-- 3. discount_daily_usage - No daily usage tracking implemented
-- 4. discount_exclusions - No exclusion rules implemented
-- 5. discount_segments - No customer segmentation for discounts
-- 6. sessions - Supabase Auth handles sessions, custom table unused

-- Verification: No foreign key constraints reference these tables
-- Impact: Zero functional impact as these features were never implemented