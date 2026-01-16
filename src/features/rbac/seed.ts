/**
 * RBAC Seed Data
 *
 * Initial roles and permissions for the dynamic RBAC system.
 * Run this after migrations to populate the RBAC tables.
 */

import { db } from '../../database';
import { roles, permissions, rolePermissions } from './shared/rbac.schema';
import { logger } from '../../utils';

// ============================================
// INITIAL ROLES
// ============================================

export const SYSTEM_ROLES = [
  {
    name: 'user',
    description: 'Standard user with basic access',
    is_system_role: true,
  },
  {
    name: 'admin',
    description: 'Administrator with elevated access',
    is_system_role: true,
  },
  {
    name: 'superadmin',
    description: 'Super administrator with full system access',
    is_system_role: true,
  },
] as const;

// ============================================
// INITIAL PERMISSIONS
// ============================================

export const INITIAL_PERMISSIONS = [
  // User Management
  { name: 'users:read', resource: 'users', action: 'read', description: 'View all user profiles' },
  {
    name: 'users:read:own',
    resource: 'users',
    action: 'read:own',
    description: 'View own profile',
  },
  { name: 'users:create', resource: 'users', action: 'create', description: 'Create new users' },
  { name: 'users:update', resource: 'users', action: 'update', description: 'Update any user' },
  {
    name: 'users:update:own',
    resource: 'users',
    action: 'update:own',
    description: 'Update own profile',
  },
  { name: 'users:delete', resource: 'users', action: 'delete', description: 'Delete users' },

  // Role Management
  { name: 'roles:read', resource: 'roles', action: 'read', description: 'View all roles' },
  {
    name: 'roles:manage',
    resource: 'roles',
    action: 'manage',
    description: 'Create, update, delete roles',
  },

  // Permission Management
  {
    name: 'permissions:read',
    resource: 'permissions',
    action: 'read',
    description: 'View all permissions',
  },
  {
    name: 'permissions:assign',
    resource: 'permissions',
    action: 'assign',
    description: 'Assign permissions to roles',
  },

  // Upload Management
  { name: 'uploads:read', resource: 'uploads', action: 'read', description: 'View all uploads' },
  {
    name: 'uploads:read:own',
    resource: 'uploads',
    action: 'read:own',
    description: 'View own uploads',
  },
  { name: 'uploads:create', resource: 'uploads', action: 'create', description: 'Upload files' },
  {
    name: 'uploads:delete',
    resource: 'uploads',
    action: 'delete',
    description: 'Delete any upload',
  },
  {
    name: 'uploads:delete:own',
    resource: 'uploads',
    action: 'delete:own',
    description: 'Delete own uploads',
  },

  // Admin Functions
  {
    name: 'admin:invitations',
    resource: 'admin',
    action: 'invitations',
    description: 'Send user invitations',
  },
  {
    name: 'admin:system',
    resource: 'admin',
    action: 'system',
    description: 'System administration',
  },

  // Chatbot
  { name: 'chatbot:use', resource: 'chatbot', action: 'use', description: 'Use chatbot features' },
  {
    name: 'chatbot:documents',
    resource: 'chatbot',
    action: 'documents',
    description: 'Manage chatbot documents',
  },

  // Product Management
  { name: 'products:create', resource: 'products', action: 'create', description: 'Create new products' },
  { name: 'products:read', resource: 'products', action: 'read', description: 'View all products (including drafts)' },
  { name: 'products:update', resource: 'products', action: 'update', description: 'Update existing products' },
  { name: 'products:delete', resource: 'products', action: 'delete', description: 'Delete products' },

  // Tag Management
  { name: 'tags:create', resource: 'tags', action: 'create', description: 'Create new tags' },
  { name: 'tags:read', resource: 'tags', action: 'read', description: 'View all tags' },
  { name: 'tags:update', resource: 'tags', action: 'update', description: 'Update existing tags' },
  { name: 'tags:delete', resource: 'tags', action: 'delete', description: 'Delete tags' },

  // Tier Management
  { name: 'tiers:create', resource: 'tiers', action: 'create', description: 'Create new tiers' },
  { name: 'tiers:read', resource: 'tiers', action: 'read', description: 'View all tiers' },
  { name: 'tiers:update', resource: 'tiers', action: 'update', description: 'Update existing tiers' },
  { name: 'tiers:delete', resource: 'tiers', action: 'delete', description: 'Delete tiers' },

  // Blog Management
  { name: 'blogs:create', resource: 'blogs', action: 'create', description: 'Create new blogs' },
  { name: 'blogs:read', resource: 'blogs', action: 'read', description: 'View all blogs' },
  { name: 'blogs:update', resource: 'blogs', action: 'update', description: 'Update existing blogs' },
  { name: 'blogs:delete', resource: 'blogs', action: 'delete', description: 'Delete blogs' },

  // Wildcard Permission (for superadmin)
  { name: '*', resource: '*', action: '*', description: 'Full system access (wildcard)' },
] as const;

// ============================================
// ROLE-PERMISSION MAPPING
// ============================================

export const ROLE_PERMISSIONS_MAP: Record<string, string[]> = {
  user: [
    'users:read:own',
    'users:update:own',
    'uploads:read:own',
    'uploads:create',
    'uploads:delete:own',
    'chatbot:use',
    'blogs:read', // Users can read blogs
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
    'chatbot:use',
    'chatbot:documents',
    'products:create',
    'products:read',
    'products:update',
    'products:delete',
    'tags:create',
    'tags:read',
    'tags:update',
    'tags:delete',
    'tiers:create',
    'tiers:read',
    'tiers:update',
    'tiers:delete',
    'blogs:create',
    'blogs:read',
    'blogs:update',
    'blogs:delete',
  ],
  superadmin: ['*'], // Wildcard - all permissions
};

// ============================================
// SEED FUNCTIONS
// ============================================

/**
 * Seed all RBAC data (roles, permissions, role-permission mappings)
 */
export async function seedRBAC(): Promise<void> {
  logger.info('🔐 Seeding RBAC data...');

  try {
    // 1. Seed roles
    const seededRoles = await seedRoles();
    logger.info(`✅ Created ${seededRoles.length} roles`);

    // 2. Seed permissions
    const seededPermissions = await seedPermissions();
    logger.info(`✅ Created ${seededPermissions.length} permissions`);

    // 3. Assign permissions to roles
    await seedRolePermissions(seededRoles, seededPermissions);
    logger.info('✅ Role-permission mappings created');

    logger.info('🎉 RBAC seeding completed successfully!');
  } catch (error) {
    logger.error('❌ RBAC seeding failed:', error);
    throw error;
  }
}

/**
 * Seed system roles
 */
async function seedRoles() {
  const existingRoles = await db.select().from(roles);

  if (existingRoles.length > 0) {
    logger.info('Roles already exist, skipping role seeding');
    return existingRoles;
  }

  const insertedRoles = await db
    .insert(roles)
    .values([...SYSTEM_ROLES])
    .returning();
  return insertedRoles;
}

/**
 * Seed permissions
 */
async function seedPermissions() {
  const existingPermissions = await db.select().from(permissions);

  if (existingPermissions.length > 0) {
    logger.info('Permissions already exist, skipping permission seeding');
    return existingPermissions;
  }

  const insertedPermissions = await db
    .insert(permissions)
    .values([...INITIAL_PERMISSIONS])
    .returning();
  return insertedPermissions;
}

/**
 * Seed role-permission mappings
 */
async function seedRolePermissions(
  rolesList: Array<{ id: string; name: string }>,
  permissionsList: Array<{ id: string; name: string }>
) {
  // Create lookup maps
  const roleIdMap = new Map(rolesList.map(r => [r.name, r.id]));
  const permissionIdMap = new Map(permissionsList.map(p => [p.name, p.id]));

  const mappings: Array<{ role_id: string; permission_id: string }> = [];

  for (const [roleName, permissionNames] of Object.entries(ROLE_PERMISSIONS_MAP)) {
    const roleId = roleIdMap.get(roleName);
    if (!roleId) {
      logger.warn(`Role not found: ${roleName}`);
      continue;
    }

    for (const permName of permissionNames) {
      const permissionId = permissionIdMap.get(permName);
      if (!permissionId) {
        logger.warn(`Permission not found: ${permName}`);
        continue;
      }

      mappings.push({
        role_id: roleId,
        permission_id: permissionId,
      });
    }
  }

  if (mappings.length > 0) {
    await db.insert(rolePermissions).values(mappings).onConflictDoNothing();
  }
}

// Export for use in database seed script
export default seedRBAC;
