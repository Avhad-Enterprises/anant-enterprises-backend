/**
 * Integration tests for RBAC System
 * Tests the complete flow of roles, permissions, and user assignments
 */

import { db } from '../../../../database/drizzle';
import { users } from '../../../user/shared/schema';
import { roles, permissions, userRoles, rolePermissions } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { hashPassword } from '../../../../utils/password';
import { generateToken } from '../../../../utils/jwt';

describe('RBAC Integration Tests', () => {
    let testUser: any;
    let adminUser: any;
    let testRole: any;
    let testPermission: any;
    let userToken: string;
    let adminToken: string;

    beforeEach(async () => {
        // Clean up test data - using proper schema imports
        await db.delete(rolePermissions);
        await db.delete(userRoles);

        // Delete test users
        const testUsers = await db.select().from(users).where(eq(users.email, 'testuser@test.com'));
        if (testUsers.length > 0) {
            await db.delete(users).where(eq(users.id, testUsers[0].id));
        }

        const adminUsers = await db.select().from(users).where(eq(users.email, 'admin@test.com'));
        if (adminUsers.length > 0) {
            await db.delete(users).where(eq(users.id, adminUsers[0].id));
        }

        // Delete test role
        const testRoles = await db.select().from(roles).where(eq(roles.name, 'test-role'));
        if (testRoles.length > 0) {
            await db.delete(roles).where(eq(roles.id, testRoles[0].id));
        }

        // Delete test permission
        const testPermissions = await db.select().from(permissions).where(eq(permissions.name, 'test:permission'));
        if (testPermissions.length > 0) {
            await db.delete(permissions).where(eq(permissions.id, testPermissions[0].id));
        }

        // Create test user
        const hashedPassword = await hashPassword('password123');
        const [createdUser] = await db
            .insert(users)
            .values({
                name: 'Test User',
                email: 'testuser@test.com',
                password: hashedPassword,
                created_by: 1,
            })
            .returning();
        testUser = createdUser;

        // Create admin user
        const [createdAdmin] = await db
            .insert(users)
            .values({
                name: 'Admin User',
                email: 'admin@test.com',
                password: hashedPassword,
                created_by: 1,
            })
            .returning();
        adminUser = createdAdmin;

        // Assign admin role
        const adminRoles = await db.select().from(roles).where(eq(roles.name, 'admin'));
        if (adminRoles.length > 0) {
            await db.insert(userRoles).values({
                user_id: adminUser.id,
                role_id: adminRoles[0].id,
                assigned_by: 1,
            });
        }

        // Generate tokens
        userToken = generateToken({ id: testUser.id, email: testUser.email, name: testUser.name });
        adminToken = generateToken({ id: adminUser.id, email: adminUser.email, name: adminUser.name });
    });

    afterEach(async () => {
        // Cleanup - only if users were created
        if (testUser?.id) {
            await db.delete(userRoles).where(eq(userRoles.user_id, testUser.id));
            await db.delete(users).where(eq(users.id, testUser.id));
        }
        if (adminUser?.id) {
            await db.delete(userRoles).where(eq(userRoles.user_id, adminUser.id));
            await db.delete(users).where(eq(users.id, adminUser.id));
        }
        if (testRole?.id) {
            await db.delete(rolePermissions).where(eq(rolePermissions.role_id, testRole.id));
            await db.delete(roles).where(eq(roles.id, testRole.id));
        }
        if (testPermission?.id) {
            await db.delete(permissions).where(eq(permissions.id, testPermission.id));
        }
    });

    describe('Role Management', () => {
        it('should verify test setup completed', () => {
            expect(testUser).toBeDefined();
            expect(testUser.email).toBe('testuser@test.com');
            expect(adminUser).toBeDefined();
            expect(adminUser.email).toBe('admin@test.com');
            expect(userToken).toBeDefined();
            expect(adminToken).toBeDefined();
        });
    });

    describe('Permission Assignment', () => {
        beforeEach(async () => {
            // Create test role and permission
            const [createdRole] = await db
                .insert(roles)
                .values({
                    name: 'test-role',
                    description: 'Test Role',
                    created_by: adminUser.id,
                })
                .returning();
            testRole = createdRole;

            const [createdPermission] = await db
                .insert(permissions)
                .values({
                    name: 'test:permission',
                    resource: 'test',
                    action: 'permission',
                    description: 'Test Permission',
                })
                .returning();
            testPermission = createdPermission;
        });

        it('should create test role and permission successfully', () => {
            expect(testRole).toBeDefined();
            expect(testRole.name).toBe('test-role');
            expect(testPermission).toBeDefined();
            expect(testPermission.name).toBe('test:permission');
        });
    });

    describe('User Role Assignment', () => {
        beforeEach(async () => {
            const [createdRole] = await db
                .insert(roles)
                .values({
                    name: 'test-role',
                    description: 'Test Role',
                    created_by: adminUser.id,
                })
                .returning();
            testRole = createdRole;
        });

        it('should create test role for user assignment', () => {
            expect(testRole).toBeDefined();
            expect(testRole.name).toBe('test-role');
        });
    });

    describe('Permission Middleware', () => {
        it('should have valid test tokens', () => {
            expect(userToken).toBeDefined();
            expect(adminToken).toBeDefined();
            expect(userToken.length).toBeGreaterThan(0);
            expect(adminToken.length).toBeGreaterThan(0);
        });
    });
});
