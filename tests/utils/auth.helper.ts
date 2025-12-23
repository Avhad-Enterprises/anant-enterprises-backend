import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { dbHelper } from './database.helper';
import { TestUser } from './factories';
import { users } from '../../src/features/user/shared/schema';
import {
  roles,
  userRoles,
  permissions,
  rolePermissions
} from '../../src/features/rbac/shared/schema';
import { eq } from 'drizzle-orm';

export class AuthTestHelper {
  /**
   * Generate a JWT token for testing
   */
  static generateJwtToken(userId: number, email: string, role: string = 'user'): string {
    const secret = process.env.JWT_SECRET || 'test-jwt-secret';
    return jwt.sign({ id: userId, email, role }, secret, { expiresIn: '24h' });
  }

  /**
   * Hash password using bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 12);
  }

  /**
   * Seed RBAC data (roles and permissions) for tests
   * This ensures admin users have proper permissions
   */
  static async seedRBACData(): Promise<void> {
    const db = dbHelper.getDb();

    // Check if roles already exist
    const existingRoles = await db.select().from(roles);
    if (existingRoles.length > 0) {
      return; // RBAC data already seeded
    }

    // Seed system roles
    const seededRoles = await db.insert(roles).values([
      { name: 'user', description: 'Standard user', is_system_role: true },
      { name: 'admin', description: 'Administrator', is_system_role: true },
      { name: 'superadmin', description: 'Super administrator', is_system_role: true },
    ]).returning();

    // Seed permissions
    const seededPermissions = await db.insert(permissions).values([
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
      { name: 'chatbot:use', resource: 'chatbot', action: 'use' },
      { name: 'chatbot:documents', resource: 'chatbot', action: 'documents' },
      { name: '*', resource: '*', action: '*' },
    ]).returning();

    // Create role-permission mappings
    const roleIdMap = new Map(seededRoles.map(r => [r.name, r.id]));
    const permIdMap = new Map(seededPermissions.map(p => [p.name, p.id]));

    const rolePermissionMappings: Record<string, string[]> = {
      user: ['users:read:own', 'users:update:own', 'uploads:read:own', 'uploads:create', 'uploads:delete:own', 'chatbot:use'],
      admin: ['users:read', 'users:create', 'users:update', 'users:delete', 'users:read:own', 'users:update:own',
        'roles:read', 'permissions:read', 'uploads:read', 'uploads:create', 'uploads:delete',
        'admin:invitations', 'chatbot:use', 'chatbot:documents'],
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

  /**
   * Get role ID by name
   */
  static async getRoleId(roleName: string): Promise<number | null> {
    const db = dbHelper.getDb();
    const [role] = await db.select().from(roles).where(eq(roles.name, roleName)).limit(1);
    return role?.id ?? null;
  }

  /**
   * Assign role to user
   */
  static async assignRoleToUser(userId: number, roleName: string): Promise<void> {
    const db = dbHelper.getDb();
    const roleId = await this.getRoleId(roleName);
    if (!roleId) {
      throw new Error(`Role '${roleName}' not found. Did you call seedRBACData()?`);
    }
    await db.insert(userRoles).values({
      user_id: userId,
      role_id: roleId,
    }).onConflictDoNothing();
  }

  /**
   * Create a test user with optional RBAC role assignment
   * @param userData - User data including optional role for RBAC assignment
   * @returns Created user, JWT token, and user ID
   */
  static async createTestUser(userData: TestUser): Promise<{
    user: { id: number; email: string; name: string; role: string };
    token: string;
    userId: number;
  }> {
    const db = dbHelper.getDb();
    const hashedPassword = await this.hashPassword(userData.password);
    const roleName = userData.role || 'user';

    // Ensure RBAC data is seeded
    await this.seedRBACData();

    // Create user in database (no role column anymore)
    const [user] = await db
      .insert(users)
      .values({
        email: userData.email,
        name: userData.name,
        password: hashedPassword,
        created_by: 1,
      })
      .returning();

    // Assign RBAC role
    await this.assignRoleToUser(user.id, roleName);

    // Generate token with role (for backward compatibility in tests)
    const token = this.generateJwtToken(user.id, user.email, roleName);

    // Return user object with role for backward compatibility
    return {
      user: { ...user, role: roleName },
      token,
      userId: user.id
    };
  }

  /**
   * Create a test user with token and return credentials
   */
  static async createTestUserWithToken(): Promise<{
    user: { id: number; email: string; name: string; role: string };
    token: string;
    rawPassword: string;
  }> {
    const rawPassword = 'TestPassword123!';
    const userData = {
      email: `testuser.${Date.now()}@example.com`,
      password: rawPassword,
      name: 'Test User',
    };

    const { user, token } = await this.createTestUser(userData);
    return { user, token, rawPassword };
  }

  /**
   * Create a test admin user with full permissions
   */
  static async createTestAdminUser(overrides?: Partial<TestUser>): Promise<{
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
    return this.createTestUser(userData);
  }

  /**
   * Create a test superadmin user with wildcard permissions
   */
  static async createTestSuperadminUser(overrides?: Partial<TestUser>): Promise<{
    user: { id: number; email: string; name: string; role: string };
    token: string;
    userId: number;
  }> {
    const userData = {
      email: `superadmin-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`,
      password: 'SuperPass123!',
      name: 'Superadmin User',
      role: 'superadmin',
      ...overrides,
    };
    return this.createTestUser(userData);
  }

  /**
   * Get authorization headers for a token
   */
  static getAuthHeaders(token: string): { Authorization: string } {
    return { Authorization: `Bearer ${token}` };
  }

  /**
   * Verify and decode a JWT token
   */
  static verifyToken(token: string): { id: number; email: string; role: string; iat: number; exp: number } {
    const secret = process.env.JWT_SECRET || 'test-jwt-secret';
    return jwt.verify(token, secret) as { id: number; email: string; role: string; iat: number; exp: number };
  }
}
