/**
 * Supabase Auth Test Helper
 *
 * Utilities for testing with Supabase Auth instead of custom JWT
 * Replaces the deprecated AuthTestHelper.ts
 */

import { supabaseAnon, supabase } from '../../src/utils/supabase';
import { db } from '../../src/database';
import { users } from '../../src/features/user/shared/user.schema';
import {
  roles,
  permissions,
  userRoles,
  rolePermissions,
} from '../../src/features/rbac/shared/schema';
import { eq } from 'drizzle-orm';

export interface TestUser {
  authUser: any; // Supabase Auth user
  publicUser: any; // public.users record
  session: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
  };
}

export class SupabaseAuthHelper {
  /**
   * Register a test user via Supabase Auth
   */
  static async registerTestUser(
    email: string,
    password: string,
    name: string,
    phone_number?: string
  ): Promise<TestUser> {
    // Create user in Supabase Auth using Admin API
    const { data: authData, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm test users
      user_metadata: {
        name,
        phone_number,
      },
    });

    if (error || !authData?.user) {
      throw new Error(`Test user registration failed: ${error?.message}`);
    }

    // Create corresponding public.users record
    const [publicUser] = await db
      .insert(users)
      .values({
        auth_id: authData.user.id,
        name,
        email,
        phone_number: phone_number || '',
        password: '', // Managed by Supabase
        is_deleted: false,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning();

    // Get session by logging in
    const { data: sessionData, error: loginError } = await supabaseAnon.auth.signInWithPassword({
      email,
      password,
    });

    if (loginError || !sessionData?.session) {
      throw new Error(`Test user login failed: ${loginError?.message}`);
    }

    return {
      authUser: authData.user,
      publicUser,
      session: {
        access_token: sessionData.session.access_token,
        refresh_token: sessionData.session.refresh_token,
        expires_in: sessionData.session.expires_in,
        token_type: sessionData.session.token_type,
      },
    };
  }

  /**
   * Login as an existing test user via Supabase Auth
   */
  static async loginTestUser(email: string, password: string): Promise<TestUser> {
    const { data: authData, error } = await supabaseAnon.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !authData?.user || !authData?.session) {
      throw new Error(`Test user login failed: ${error?.message}`);
    }

    // Get public.users record
    const publicUser = await db
      .select()
      .from(users)
      .where(eq(users.auth_id, authData.user.id))
      .limit(1)
      .then(rows => rows[0]);

    if (!publicUser) {
      throw new Error('Public user record not found');
    }

    return {
      authUser: authData.user,
      publicUser,
      session: {
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
        expires_in: authData.session.expires_in,
        token_type: authData.session.token_type,
      },
    };
  }

  /**
   * Get Authorization header for API requests
   */
  static getAuthHeader(accessToken: string): { Authorization: string } {
    return { Authorization: `Bearer ${accessToken}` };
  }

  /**
   * Create a test user with optional RBAC role assignment (compatibility method)
   */
  static async createTestUser(userData: {
    email: string;
    password: string;
    name?: string;
    role?: string;
  }): Promise<{
    user: { id: number; email: string; name: string; role: string };
    token: string;
    userId: number;
  }> {
    const roleName = userData.role || 'user';
    const name = userData.name || 'Test User';

    const testUser = await this.registerTestUser(userData.email, userData.password, name);

    // Seed RBAC data and assign role if needed
    if (roleName !== 'user') {
      await this.seedRBACData();
      const { assignRoleToUser } = await import('../../src/features/rbac');
      // Look up role by name instead of hardcoding ID
      const [role] = await db.select().from(roles).where(eq(roles.name, roleName));
      if (role) {
        await assignRoleToUser(testUser.publicUser.id, role.id);
      }
    }

    return {
      user: {
        id: testUser.publicUser.id,
        email: testUser.publicUser.email,
        name: testUser.publicUser.name,
        role: roleName,
      },
      token: testUser.session.access_token,
      userId: testUser.publicUser.id,
    };
  }

  /**
   * Create a test user with token and return credentials (compatibility method)
   */
  static async createTestUserWithToken(): Promise<{
    user: { id: number; email: string; name: string; role: string };
    token: string;
    rawPassword: string;
  }> {
    const rawPassword = 'TestPassword123!';
    const email = `testuser.${Date.now()}@example.com`;

    const { user, token } = await this.createTestUser({
      email,
      password: rawPassword,
      name: 'Test User',
    });

    return { user, token, rawPassword };
  }

  /**
   * Create a test admin user with full permissions (compatibility method)
   */
  static async createTestAdminUser(
    overrides?: Partial<{
      email: string;
      password: string;
      name: string;
    }>
  ): Promise<{
    user: { id: number; email: string; name: string; role: string };
    token: string;
    userId: number;
  }> {
    const userData = {
      email: `admin-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`,
      password: 'AdminPass123!',
      name: 'Admin User',
      role: 'admin',
      ...overrides,
    };

    return await this.createTestUser(userData);
  }

  /**
   * Create a test superadmin user (compatibility method)
   */
  static async createTestSuperadminUser(): Promise<{
    user: { id: number; email: string; name: string; role: string };
    token: string;
    userId: number;
  }> {
    const userData = {
      email: `superadmin-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`,
      password: 'SuperAdminPass123!',
      name: 'Super Admin User',
      role: 'superadmin',
    };

    return await this.createTestUser(userData);
  }

  /**
   * Seed RBAC data (roles and permissions) for tests (compatibility method)
   */
  static async seedRBACData(): Promise<void> {
    try {
      // Check if roles already exist
      const existingRoles = await db.select().from(roles);
      if (existingRoles.length > 0) {
        // Roles exist, make sure permissions and mappings exist too
        const existingPermissions = await db.select().from(permissions);
        if (existingPermissions.length === 0) {
          // Permissions are missing, seed them
          await db.insert(permissions).values([
            { name: 'users:read', resource: 'users', action: 'read' },
            { name: 'users:read:own', resource: 'users', action: 'read:own' },
            { name: 'users:create', resource: 'users', action: 'create' },
            { name: 'users:update', resource: 'users', action: 'update' },
            { name: 'users:update:own', resource: 'users', action: 'update:own' },
            { name: 'users:delete', resource: 'users', action: 'delete' },
            { name: 'roles:read', resource: 'roles', action: 'read' },
            { name: 'roles:manage', resource: 'roles', action: 'manage' },
            { name: 'permissions:read', resource: 'permissions', action: 'read' },
            { name: 'permissions:assign', resource: 'permissions', action: 'assign' },
            { name: 'uploads:read', resource: 'uploads', action: 'read' },
            { name: 'uploads:read:own', resource: 'uploads', action: 'read:own' },
            { name: 'uploads:create', resource: 'uploads', action: 'create' },
            { name: 'uploads:delete', resource: 'uploads', action: 'delete' },
            { name: 'uploads:delete:own', resource: 'uploads', action: 'delete:own' },
            { name: 'admin:invitations', resource: 'admin', action: 'invitations' },
            { name: 'admin:system', resource: 'admin', action: 'system' },
            { name: 'audit:read', resource: 'audit', action: 'read' },
            { name: 'chatbot:use', resource: 'chatbot', action: 'use' },
            { name: 'chatbot:documents', resource: 'chatbot', action: 'documents' },
            { name: '*', resource: '*', action: '*' },
          ]);
        }

        // Check if role-permission mappings exist
        const existingMappings = await db.select().from(rolePermissions);
        if (existingMappings.length === 0) {
          // Mappings are missing, create them
          const allRoles = await db.select().from(roles);
          const allPermissions = await db.select().from(permissions);

          const roleIdMap = new Map(allRoles.map(r => [r.name, r.id]));
          const permIdMap = new Map(allPermissions.map(p => [p.name, p.id]));

          const rolePermissionMappings: Record<string, string[]> = {
            user: [
              'users:read:own',
              'users:update:own',
              'uploads:read:own',
              'uploads:create',
              'uploads:delete:own',
              'chatbot:use',
            ],
            admin: [
              'users:read',
              'users:create',
              'users:update',
              'users:delete',
              'users:read:own',
              'users:update:own',
              'roles:read',
              'permissions:read',
              'uploads:read',
              'uploads:create',
              'uploads:delete',
              'admin:invitations',
              'audit:read',
              'chatbot:use',
              'chatbot:documents',
            ],
            superadmin: ['*'],
          };

          const mappings: { role_id: number; permission_id: number }[] = [];
          for (const [roleName, perms] of Object.entries(rolePermissionMappings)) {
            const roleId = roleIdMap.get(roleName);
            if (!roleId) continue;
            for (const permName of perms) {
              const permId = permIdMap.get(permName);
              if (permId) {
                mappings.push({ role_id: roleId, permission_id: permId });
              }
            }
          }

          if (mappings.length > 0) {
            await db.insert(rolePermissions).values(mappings).onConflictDoNothing();
          }
        }

        return; // Roles exist, skip seeding
      }

      // Seed system roles
      await db.insert(roles).values([
        { name: 'user', description: 'Standard user', is_system_role: true },
        { name: 'admin', description: 'Administrator', is_system_role: true },
        { name: 'superadmin', description: 'Super administrator', is_system_role: true },
      ]);

      // Seed permissions
      await db.insert(permissions).values([
        { name: 'users:read', resource: 'users', action: 'read' },
        { name: 'users:read:own', resource: 'users', action: 'read:own' },
        { name: 'users:create', resource: 'users', action: 'create' },
        { name: 'users:update', resource: 'users', action: 'update' },
        { name: 'users:update:own', resource: 'users', action: 'update:own' },
        { name: 'users:delete', resource: 'users', action: 'delete' },
        { name: 'roles:read', resource: 'roles', action: 'read' },
        { name: 'roles:manage', resource: 'roles', action: 'manage' },
        { name: 'permissions:read', resource: 'permissions', action: 'read' },
        { name: 'permissions:assign', resource: 'permissions', action: 'assign' },
        { name: 'uploads:read', resource: 'uploads', action: 'read' },
        { name: 'uploads:read:own', resource: 'uploads', action: 'read:own' },
        { name: 'uploads:create', resource: 'uploads', action: 'create' },
        { name: 'uploads:delete', resource: 'uploads', action: 'delete' },
        { name: 'uploads:delete:own', resource: 'uploads', action: 'delete:own' },
        { name: 'admin:invitations', resource: 'admin', action: 'invitations' },
        { name: 'admin:system', resource: 'admin', action: 'system' },
        { name: 'audit:read', resource: 'audit', action: 'read' },
        { name: 'chatbot:use', resource: 'chatbot', action: 'use' },
        { name: 'chatbot:documents', resource: 'chatbot', action: 'documents' },
        { name: '*', resource: '*', action: '*' },
      ]);

      // Fetch all roles and permissions to build mappings
      const allRoles = await db.select().from(roles);
      const allPermissions = await db.select().from(permissions);

      // Create role-permission mappings
      const roleIdMap = new Map(allRoles.map(r => [r.name, r.id]));
      const permIdMap = new Map(allPermissions.map(p => [p.name, p.id]));

      const rolePermissionMappings: Record<string, string[]> = {
        user: [
          'users:read:own',
          'users:update:own',
          'uploads:read:own',
          'uploads:create',
          'uploads:delete:own',
          'chatbot:use',
        ],
        admin: [
          'users:read',
          'users:create',
          'users:update',
          'users:delete',
          'users:read:own',
          'users:update:own',
          'roles:read',
          'permissions:read',
          'uploads:read',
          'uploads:create',
          'uploads:delete',
          'admin:invitations',
          'audit:read',
          'chatbot:use',
          'chatbot:documents',
        ],
        superadmin: ['*'],
      };

      const mappings: { role_id: number; permission_id: number }[] = [];
      for (const [roleName, perms] of Object.entries(rolePermissionMappings)) {
        const roleId = roleIdMap.get(roleName);
        if (!roleId) continue;
        for (const permName of perms) {
          const permId = permIdMap.get(permName);
          if (permId) {
            mappings.push({ role_id: roleId, permission_id: permId });
          }
        }
      }

      if (mappings.length > 0) {
        await db.insert(rolePermissions).values(mappings).onConflictDoNothing();
      }
    } catch (error) {
      // Ignore errors in unit tests where database is mocked
      if (process.env.NODE_ENV === 'test') {
        return;
      }
      throw error;
    }
  }

  /**
   * Get user role by user ID
   */
  static async getUserRole(userId: number): Promise<string> {
    const [userRole] = await db
      .select({ roleName: roles.name })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.role_id, roles.id))
      .where(eq(userRoles.user_id, userId))
      .limit(1);

    return userRole?.roleName || 'user';
  }

  /**
   * Verify a token (compatibility method) - uses Supabase's built-in verification
   */
  static async verifyToken(accessToken: string): Promise<any> {
    const { data, error } = await supabaseAnon.auth.getUser(accessToken);

    if (error || !data?.user) {
      throw new Error(`Token verification failed: ${error?.message}`);
    }

    return data.user;
  }

  /**
   * Cleanup test user from both auth.users and public.users
   */
  static async cleanupTestUser(authId: string): Promise<void> {
    try {
      // Delete from public.users first
      await db.delete(users).where(eq(users.auth_id, authId));

      // Delete from auth.users
      await supabase.auth.admin.deleteUser(authId);
    } catch (error) {
      console.error('Failed to cleanup test user:', error);
      // Don't throw - this is cleanup
    }
  }

  /**
   * Cleanup multiple test users
   */
  static async cleanupTestUsers(authIds: string[]): Promise<void> {
    await Promise.all(authIds.map(id => this.cleanupTestUser(id)));
  }

  /**
   * Refresh access token using refresh token
   */
  static async refreshToken(
    refreshToken: string
  ): Promise<{ access_token: string; refresh_token: string }> {
    const { data, error } = await supabaseAnon.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data?.session) {
      throw new Error(`Token refresh failed: ${error?.message}`);
    }

    return {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    };
  }

  /**
   * Get current session for a user
   */
  static async getSession(): Promise<any> {
    const { data, error } = await supabaseAnon.auth.getSession();

    if (error) {
      throw new Error(`Get session failed: ${error?.message}`);
    }

    return data.session;
  }

  /**
   * Sign out a test user
   */
  static async signOut(): Promise<void> {
    const { error } = await supabaseAnon.auth.signOut();

    if (error) {
      throw new Error(`Sign out failed: ${error?.message}`);
    }
  }
}
