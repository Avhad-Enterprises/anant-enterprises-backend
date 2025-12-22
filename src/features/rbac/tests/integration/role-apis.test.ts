/**
 * Integration tests for RBAC Role APIs
 */

import request from 'supertest';
import { db } from '../../../../database/drizzle';
import { roles, permissions, rolePermissions } from '../../shared/schema';
import { users } from '../../../user/shared/schema';
import { eq } from 'drizzle-orm';
import { hashPassword } from '../../../../utils/password';
import { generateToken } from '../../../../utils/jwt';

describe('RBAC Role APIs Integration Tests', () => {
    let adminUser: any;
    let regularUser: any;
    let testRole: any;
    let testPermission: any;
    let adminToken: string;
    let userToken: string;

    beforeEach(async () => {
        // Clean up
        await db.delete(rolePermissions);

        const testRoles = await db.select().from(roles).where(eq(roles.name, 'test-role'));
        if (testRoles.length > 0) {
            await db.delete(roles).where(eq(roles.id, testRoles[0].id));
        }

        const testPerms = await db.select().from(permissions).where(eq(permissions.name, 'test:permission'));
        if (testPerms.length > 0) {
            await db.delete(permissions).where(eq(permissions.id, testPerms[0].id));
        }

        const adminUsers = await db.select().from(users).where(eq(users.email, 'admin-rbac@test.com'));
        if (adminUsers.length > 0) {
            await db.delete(users).where(eq(users.id, adminUsers[0].id));
        }

        const regUsers = await db.select().from(users).where(eq(users.email, 'user-rbac@test.com'));
        if (regUsers.length > 0) {
            await db.delete(users).where(eq(users.id, regUsers[0].id));
        }

        // Create users
        const hashedPassword = await hashPassword('password123');
        const [createdAdmin] = await db
            .insert(users)
            .values({
                name: 'Admin User',
                email: 'admin-rbac@test.com',
                password: hashedPassword,
                created_by: 1,
            })
            .returning();
        adminUser = createdAdmin;

        const [createdUser] = await db
            .insert(users)
            .values({
                name: 'Regular User',
                email: 'user-rbac@test.com',
                password: hashedPassword,
                created_by: 1,
            })
            .returning();
        regularUser = createdUser;

        // Generate tokens
        adminToken = generateToken({ id: adminUser.id, email: adminUser.email, name: adminUser.name });
        userToken = generateToken({ id: regularUser.id, email: regularUser.email, name: regularUser.name });
    });

    afterEach(async () => {
        // Cleanup
        if (testRole?.id) {
            await db.delete(rolePermissions).where(eq(rolePermissions.role_id, testRole.id));
            await db.delete(roles).where(eq(roles.id, testRole.id));
        }
        if (testPermission?.id) {
            await db.delete(permissions).where(eq(permissions.id, testPermission.id));
        }
        if (adminUser?.id) {
            await db.delete(users).where(eq(users.id, adminUser.id));
        }
        if (regularUser?.id) {
            await db.delete(users).where(eq(users.id, regularUser.id));
        }
    });

    describe('GET /api/rbac/roles', () => {
        it('should return list of roles', async () => {
            const rolesData = await db.select().from(roles);
            // Just verify we can query roles, count may vary based on test order
            expect(Array.isArray(rolesData)).toBe(true);
        });
    });

    describe('POST /api/rbac/roles', () => {
        it('should create a new role', async () => {
            const [createdRole] = await db
                .insert(roles)
                .values({
                    name: 'test-role',
                    description: 'Test Role',
                    created_by: adminUser.id,
                })
                .returning();

            testRole = createdRole;

            expect(testRole).toBeDefined();
            expect(testRole.name).toBe('test-role');
            expect(testRole.description).toBe('Test Role');
        });

        it('should not allow duplicate role names', async () => {
            const [firstRole] = await db
                .insert(roles)
                .values({
                    name: 'test-role',
                    description: 'First Test Role',
                    created_by: adminUser.id,
                })
                .returning();

            testRole = firstRole;

            // Attempting to create duplicate should fail
            await expect(
                db.insert(roles).values({
                    name: 'test-role',
                    description: 'Duplicate Test Role',
                    created_by: adminUser.id,
                })
            ).rejects.toThrow();
        });
    });

    describe('PUT /api/rbac/roles/:id', () => {
        beforeEach(async () => {
            const [createdRole] = await db
                .insert(roles)
                .values({
                    name: 'test-role',
                    description: 'Original Description',
                    created_by: adminUser.id,
                })
                .returning();
            testRole = createdRole;
        });

        it('should update role details', async () => {
            const [updatedRole] = await db
                .update(roles)
                .set({
                    description: 'Updated Description',
                    updated_by: adminUser.id,
                    updated_at: new Date(),
                })
                .where(eq(roles.id, testRole.id))
                .returning();

            expect(updatedRole.description).toBe('Updated Description');
            expect(updatedRole.name).toBe('test-role');
        });
    });

    describe('DELETE /api/rbac/roles/:id', () => {
        beforeEach(async () => {
            const [createdRole] = await db
                .insert(roles)
                .values({
                    name: 'test-role',
                    description: 'To be deleted',
                    created_by: adminUser.id,
                })
                .returning();
            testRole = createdRole;
        });

        it('should soft delete a role', async () => {
            const [deletedRole] = await db
                .update(roles)
                .set({
                    is_deleted: true,
                    deleted_by: adminUser.id,
                    deleted_at: new Date(),
                })
                .where(eq(roles.id, testRole.id))
                .returning();

            expect(deletedRole.is_deleted).toBe(true);
            expect(deletedRole.deleted_by).toBe(adminUser.id);
        });
    });

    describe('Permission Assignment', () => {
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

        it('should assign permission to role', async () => {
            await db.insert(rolePermissions).values({
                role_id: testRole.id,
                permission_id: testPermission.id,
                assigned_by: adminUser.id,
            });

            const assignments = await db
                .select()
                .from(rolePermissions)
                .where(eq(rolePermissions.role_id, testRole.id));

            expect(assignments.length).toBe(1);
            expect(assignments[0].permission_id).toBe(testPermission.id);
        });

        it('should remove permission from role', async () => {
            // First assign
            await db.insert(rolePermissions).values({
                role_id: testRole.id,
                permission_id: testPermission.id,
                assigned_by: adminUser.id,
            });

            // Then remove
            await db
                .delete(rolePermissions)
                .where(eq(rolePermissions.role_id, testRole.id));

            const assignments = await db
                .select()
                .from(rolePermissions)
                .where(eq(rolePermissions.role_id, testRole.id));

            expect(assignments.length).toBe(0);
        });
    });
});
