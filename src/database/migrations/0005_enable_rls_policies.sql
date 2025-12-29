-- Enable Row Level Security on all tables
-- Migration: Enable RLS and create policies for secure data access
-- Author: Phase 1 Migration
-- Date: 2025-12-29

-- ==================================================
-- ENABLE RLS ON ALL TABLES
-- ==================================================

-- User Management Tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- RBAC Tables
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Upload Tables
ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;

-- Chatbot Tables
ALTER TABLE chatbot_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatbot_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatbot_messages ENABLE ROW LEVEL SECURITY;

-- Audit Tables
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Admin Invite Tables
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- ==================================================
-- HELPER FUNCTION: Get Current User ID
-- ==================================================

-- Function to extract user ID from JWT
CREATE OR REPLACE FUNCTION auth.user_id()
RETURNS INTEGER AS $$
BEGIN
  -- Extract user ID from JWT claims
  -- JWT is set by middleware and contains user.id
  RETURN NULLIF(current_setting('request.jwt.claims', true)::json->>'id', '')::INTEGER;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==================================================
-- HELPER FUNCTION: Check if User Has Permission
-- ==================================================

CREATE OR REPLACE FUNCTION auth.has_permission(permission_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN role_permissions rp ON ur.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = auth.user_id()
      AND p.name = permission_name
      AND ur.is_deleted = false
      AND rp.is_deleted = false
      AND p.is_deleted = false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==================================================
-- HELPER FUNCTION: Check if User Has Role
-- ==================================================

CREATE OR REPLACE FUNCTION auth.has_role(role_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.user_id()
      AND r.name = role_name
      AND ur.is_deleted = false
      AND r.is_deleted = false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==================================================
-- USERS TABLE POLICIES
-- ==================================================

-- Users can view their own profile
CREATE POLICY "users_select_own"
ON users FOR SELECT
USING (id = auth.user_id());

-- Admins can view all users
CREATE POLICY "users_select_admin"
ON users FOR SELECT
USING (auth.has_role('admin') OR auth.has_role('superadmin'));

-- Users can update their own profile (except sensitive fields)
CREATE POLICY "users_update_own"
ON users FOR UPDATE
USING (id = auth.user_id())
WITH CHECK (
  id = auth.user_id()
  -- Prevent users from modifying their own role-related audit fields
  AND created_by IS NOT DISTINCT FROM (SELECT created_by FROM users WHERE id = auth.user_id())
  AND deleted_by IS NOT DISTINCT FROM (SELECT deleted_by FROM users WHERE id = auth.user_id())
);

-- Admins can update any user
CREATE POLICY "users_update_admin"
ON users FOR UPDATE
USING (auth.has_role('admin') OR auth.has_role('superadmin'));

-- New users can be created (registration is handled separately)
CREATE POLICY "users_insert_public"
ON users FOR INSERT
WITH CHECK (true);

-- Only admins can delete users
CREATE POLICY "users_delete_admin"
ON users FOR DELETE
USING (auth.has_role('admin') OR auth.has_role('superadmin'));

-- ==================================================
-- USER PROFILES TABLE POLICIES
-- ==================================================

-- Users can view their own profile
CREATE POLICY "user_profiles_select_own"
ON user_profiles FOR SELECT
USING (user_id = auth.user_id());

-- Admins can view all profiles
CREATE POLICY "user_profiles_select_admin"
ON user_profiles FOR SELECT
USING (auth.has_role('admin') OR auth.has_role('superadmin'));

-- Users can update their own profile
CREATE POLICY "user_profiles_update_own"
ON user_profiles FOR UPDATE
USING (user_id = auth.user_id());

-- Admins can update any profile
CREATE POLICY "user_profiles_update_admin"
ON user_profiles FOR UPDATE
USING (auth.has_role('admin') OR auth.has_role('superadmin'));

-- Users can insert their own profile
CREATE POLICY "user_profiles_insert_own"
ON user_profiles FOR INSERT
WITH CHECK (user_id = auth.user_id());

-- ==================================================
-- UPLOADS TABLE POLICIES
-- ==================================================

-- Users can view their own uploads
CREATE POLICY "uploads_select_own"
ON uploads FOR SELECT
USING (user_id = auth.user_id());

-- Users with uploads:read permission can view all uploads
CREATE POLICY "uploads_select_permission"
ON uploads FOR SELECT
USING (auth.has_permission('uploads:read'));

-- Users can create their own uploads
CREATE POLICY "uploads_insert_own"
ON uploads FOR INSERT
WITH CHECK (user_id = auth.user_id());

-- Users can update their own uploads
CREATE POLICY "uploads_update_own"
ON uploads FOR UPDATE
USING (user_id = auth.user_id());

-- Users with uploads:update permission can update any upload
CREATE POLICY "uploads_update_permission"
ON uploads FOR UPDATE
USING (auth.has_permission('uploads:update'));

-- Users can delete their own uploads
CREATE POLICY "uploads_delete_own"
ON uploads FOR DELETE
USING (user_id = auth.user_id());

-- Users with uploads:delete permission can delete any upload
CREATE POLICY "uploads_delete_permission"
ON uploads FOR DELETE
USING (auth.has_permission('uploads:delete'));

-- ==================================================
-- CHATBOT DOCUMENTS TABLE POLICIES
-- ==================================================

-- Users can view their own documents
CREATE POLICY "chatbot_documents_select_own"
ON chatbot_documents FOR SELECT
USING (user_id = auth.user_id());

-- Admins can view all documents
CREATE POLICY "chatbot_documents_select_admin"
ON chatbot_documents FOR SELECT
USING (auth.has_role('admin') OR auth.has_role('superadmin'));

-- Users can create their own documents
CREATE POLICY "chatbot_documents_insert_own"
ON chatbot_documents FOR INSERT
WITH CHECK (user_id = auth.user_id());

-- Users can update their own documents
CREATE POLICY "chatbot_documents_update_own"
ON chatbot_documents FOR UPDATE
USING (user_id = auth.user_id());

-- Users can delete their own documents
CREATE POLICY "chatbot_documents_delete_own"
ON chatbot_documents FOR DELETE
USING (user_id = auth.user_id());

-- ==================================================
-- CHATBOT SESSIONS TABLE POLICIES
-- ==================================================

-- Users can view their own sessions
CREATE POLICY "chatbot_sessions_select_own"
ON chatbot_sessions FOR SELECT
USING (user_id = auth.user_id());

-- Admins can view all sessions
CREATE POLICY "chatbot_sessions_select_admin"
ON chatbot_sessions FOR SELECT
USING (auth.has_role('admin') OR auth.has_role('superadmin'));

-- Users can create their own sessions
CREATE POLICY "chatbot_sessions_insert_own"
ON chatbot_sessions FOR INSERT
WITH CHECK (user_id = auth.user_id());

-- Users can update their own sessions
CREATE POLICY "chatbot_sessions_update_own"
ON chatbot_sessions FOR UPDATE
USING (user_id = auth.user_id());

-- Users can delete their own sessions
CREATE POLICY "chatbot_sessions_delete_own"
ON chatbot_sessions FOR DELETE
USING (user_id = auth.user_id());

-- ==================================================
-- CHATBOT MESSAGES TABLE POLICIES
-- ==================================================

-- Users can view messages in their own sessions
CREATE POLICY "chatbot_messages_select_own"
ON chatbot_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM chatbot_sessions
    WHERE chatbot_sessions.id = chatbot_messages.session_id
      AND chatbot_sessions.user_id = auth.user_id()
  )
);

-- Admins can view all messages
CREATE POLICY "chatbot_messages_select_admin"
ON chatbot_messages FOR SELECT
USING (auth.has_role('admin') OR auth.has_role('superadmin'));

-- Users can create messages in their own sessions
CREATE POLICY "chatbot_messages_insert_own"
ON chatbot_messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM chatbot_sessions
    WHERE chatbot_sessions.id = chatbot_messages.session_id
      AND chatbot_sessions.user_id = auth.user_id()
  )
);

-- Users can update messages in their own sessions
CREATE POLICY "chatbot_messages_update_own"
ON chatbot_messages FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM chatbot_sessions
    WHERE chatbot_sessions.id = chatbot_messages.session_id
      AND chatbot_sessions.user_id = auth.user_id()
  )
);

-- ==================================================
-- RBAC TABLES POLICIES
-- ==================================================

-- All authenticated users can view roles
CREATE POLICY "roles_select_all"
ON roles FOR SELECT
USING (auth.user_id() IS NOT NULL);

-- Only admins can manage roles
CREATE POLICY "roles_manage_admin"
ON roles FOR ALL
USING (auth.has_role('admin') OR auth.has_role('superadmin'));

-- All authenticated users can view permissions
CREATE POLICY "permissions_select_all"
ON permissions FOR SELECT
USING (auth.user_id() IS NOT NULL);

-- Only admins can manage permissions
CREATE POLICY "permissions_manage_admin"
ON permissions FOR ALL
USING (auth.has_role('admin') OR auth.has_role('superadmin'));

-- All authenticated users can view role-permission mappings
CREATE POLICY "role_permissions_select_all"
ON role_permissions FOR SELECT
USING (auth.user_id() IS NOT NULL);

-- Only admins can manage role-permission mappings
CREATE POLICY "role_permissions_manage_admin"
ON role_permissions FOR ALL
USING (auth.has_role('admin') OR auth.has_role('superadmin'));

-- Users can view their own role assignments
CREATE POLICY "user_roles_select_own"
ON user_roles FOR SELECT
USING (user_id = auth.user_id());

-- Admins can view all role assignments
CREATE POLICY "user_roles_select_admin"
ON user_roles FOR SELECT
USING (auth.has_role('admin') OR auth.has_role('superadmin'));

-- Only admins can manage user role assignments
CREATE POLICY "user_roles_manage_admin"
ON user_roles FOR ALL
USING (auth.has_role('admin') OR auth.has_role('superadmin'));

-- ==================================================
-- AUDIT LOGS TABLE POLICIES
-- ==================================================

-- Users can view their own audit logs
CREATE POLICY "audit_logs_select_own"
ON audit_logs FOR SELECT
USING (user_id = auth.user_id()::TEXT);

-- Admins can view all audit logs
CREATE POLICY "audit_logs_select_admin"
ON audit_logs FOR SELECT
USING (auth.has_role('admin') OR auth.has_role('superadmin'));

-- Audit logs can only be inserted (no updates/deletes)
CREATE POLICY "audit_logs_insert_all"
ON audit_logs FOR INSERT
WITH CHECK (true);

-- ==================================================
-- INVITATIONS TABLE POLICIES
-- ==================================================

-- Only admins can view invitations
CREATE POLICY "invitations_select_admin"
ON invitations FOR SELECT
USING (auth.has_role('admin') OR auth.has_role('superadmin'));

-- Only admins can create invitations
CREATE POLICY "invitations_insert_admin"
ON invitations FOR INSERT
WITH CHECK (auth.has_role('admin') OR auth.has_role('superadmin'));

-- Only admins can update invitations
CREATE POLICY "invitations_update_admin"
ON invitations FOR UPDATE
USING (auth.has_role('admin') OR auth.has_role('superadmin'));

-- Only admins can delete invitations
CREATE POLICY "invitations_delete_admin"
ON invitations FOR DELETE
USING (auth.has_role('admin') OR auth.has_role('superadmin'));

-- ==================================================
-- GRANT PERMISSIONS TO AUTHENTICATED ROLE
-- ==================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO authenticated;

-- Grant select on all tables (RLS will restrict access)
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;

-- Grant insert/update/delete on tables where appropriate (RLS will restrict)
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

-- Grant usage on all sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ==================================================
-- COMMENTS
-- ==================================================

COMMENT ON FUNCTION auth.user_id() IS 'Extract user ID from JWT claims set by middleware';
COMMENT ON FUNCTION auth.has_permission(TEXT) IS 'Check if current user has a specific permission';
COMMENT ON FUNCTION auth.has_role(TEXT) IS 'Check if current user has a specific role';
