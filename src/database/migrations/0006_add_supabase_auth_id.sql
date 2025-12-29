-- Migration 0006: Add Supabase Auth Integration
-- Add auth_id column to link users table with Supabase Auth
-- Make password optional since Supabase Auth handles it
-- Author: Phase 3 Migration
-- Date: 2025-12-29

-- ==================================================
-- ADD SUPABASE AUTH ID COLUMN
-- ==================================================

-- Add UUID column to link with Supabase Auth users
ALTER TABLE users ADD COLUMN auth_id UUID UNIQUE;

-- Make password optional (Supabase Auth stores passwords)
ALTER TABLE users ALTER COLUMN password DROP NOT NULL;

-- Add index for auth_id lookups
CREATE INDEX users_auth_id_idx ON users(auth_id);

-- ==================================================
-- ADD HELPER FUNCTION FOR AUTH_ID LOOKUP
-- ==================================================

-- Function to get integer user ID from Supabase auth UUID
CREATE OR REPLACE FUNCTION public.get_user_id_from_auth_id(auth_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (SELECT id FROM users WHERE auth_id = auth_uuid AND is_deleted = false LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get auth_id from integer user ID
CREATE OR REPLACE FUNCTION public.get_auth_id_from_user_id(user_integer_id INTEGER)
RETURNS UUID AS $$
BEGIN
  RETURN (SELECT auth_id FROM users WHERE id = user_integer_id AND is_deleted = false LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==================================================
-- UPDATE RLS HELPER FUNCTION FOR SUPABASE JWT
-- ==================================================

-- Update auth.user_id() to read from Supabase JWT
-- Supabase JWT uses 'sub' field (UUID) instead of 'id' field
CREATE OR REPLACE FUNCTION auth.user_id()
RETURNS INTEGER AS $$
DECLARE
  auth_uuid UUID;
  user_integer_id INTEGER;
BEGIN
  -- Extract UUID from Supabase JWT 'sub' field
  auth_uuid := NULLIF(current_setting('request.jwt.claims', true)::json->>'sub', '')::UUID;
  
  IF auth_uuid IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Convert UUID to integer ID for RBAC compatibility
  user_integer_id := public.get_user_id_from_auth_id(auth_uuid);
  
  RETURN user_integer_id;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==================================================
-- COMMENTS
-- ==================================================

COMMENT ON COLUMN users.auth_id IS 'Links to Supabase Auth user (auth.users.id). UUID format.';
COMMENT ON COLUMN users.password IS 'Legacy field - password now stored in Supabase Auth (auth.users). Can be NULL.';
COMMENT ON FUNCTION public.get_user_id_from_auth_id(UUID) IS 'Convert Supabase auth_id (UUID) to integer user ID for RBAC';
COMMENT ON FUNCTION public.get_auth_id_from_user_id(INTEGER) IS 'Convert integer user ID to Supabase auth_id (UUID)';
COMMENT ON FUNCTION auth.user_id() IS 'Extract user ID from Supabase JWT and convert to integer for RLS policies';
