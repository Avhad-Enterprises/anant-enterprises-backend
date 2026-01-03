-- Migration: Create Auth Sync Trigger
-- Created: 2026-01-03
-- Description: Automatically syncs Supabase Auth users to public.users table
-- 
-- This migration creates a PostgreSQL trigger that automatically syncs
-- new users from Supabase Auth (auth.users) to the public.users table.
-- When a user signs up via Supabase Auth, this trigger:
-- - Creates a corresponding record in public.users
-- - Extracts user metadata (name, phone, user_type)
-- - Links via auth_id field
-- - Handles conflicts gracefully

-- ============================================================================
-- FUNCTION: handle_new_user
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert new user record in public.users
  INSERT INTO public.users (
    auth_id,
    email,
    name,
    phone_number,
    phone_country_code,
    user_type,
    password,
    is_deleted,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone_number'),
    NEW.raw_user_meta_data->>'phone_country_code',
    COALESCE(
      (NEW.raw_user_meta_data->>'user_type')::user_type,
      'individual'::user_type
    ),
    '',
    false,
    NOW(),
    NOW()
  )
  ON CONFLICT (auth_id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    phone_number = COALESCE(EXCLUDED.phone_number, users.phone_number),
    updated_at = NOW();

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error syncing user to public.users: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- ============================================================================
-- TRIGGER: on_auth_user_created
-- ============================================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON FUNCTION public.handle_new_user() IS 
  'Automatically syncs new Supabase Auth users to public.users table';

COMMENT ON TRIGGER on_auth_user_created ON auth.users IS 
  'Triggers user sync to public.users when new auth user is created';
