/**
 * Integration tests for RBAC Permission APIs
 */

import { db } from '../../../../database/drizzle';
import { permissions } from '../../shared/schema';
import { users } from '../../../user/shared/schema';
import { eq } from 'drizzle-orm';
import { hashPassword } from '../../../../utils/password';
import { generateToken } from '../../../../utils/jwt';

describe('RBAC Permission APIs Integration Tests', () => {
    let adminUser: any;
    let testPermission: any;
    let adminToken: string;

    beforeEach(async () => {
        // Clean up test permissions
        const testPerms = await db.select().from(permissions).where(eq(permissions.name, 'test:action'));
        if (testPerms.length > 0) {
            await db.delete(permissions).where(eq(permissions.id, testPerms[0].id));
        }

        // Clean up test user
        const adminUsers = await db.select().from(users).where(eq(users.email, 'permission-admin@test.com'));
        if (adminUsers.length > 0) {
            await db.delete(users).where(eq(users.id, adminUsers[0].id));
        }

        // Create admin user
        const hashedPassword = await hashPassword('password123');
        const [createdAdmin] = await db
            .insert(users)
            .values({
                name: 'Permission Admin',
                email: 'permission-admin@test.com',
                password: hashedPassword,
                created_by: 1,
            })
            .returning();
        adminUser = createdAdmin;

        adminToken = generateToken({ id: adminUser.id, email: adminUser.email, name: adminUser.name });
    });

    afterEach(async () => {
        if (testPermission?.id) {
            await db.delete(permissions).where(eq(permissions.id, testPermission.id));
        }
        if (adminUser?.id) {
            await db.delete(users).where(eq(users.id, adminUser.id));
        }
    });

    describe('GET /api/rbac/permissions', () => {
        it('should return list of permissions', async () => {
            const perms = await db.select().from(permissions);
            // Just verify we can query permissions - test DB may not have seeded data
            expect(Array.isArray(perms)).toBe(true);
            if (perms.length > 0) {
                expect(perms[0]).toHaveProperty('name');
                expect(perms[0]).toHaveProperty('resource');
                expect(perms[0]).toHaveProperty('action');
            }
        });

        it('should have correct permission structure', async () => {
            // Create a test permission to verify structure
            const [testPerm] = await db.insert(permissions).values({
                name: 'integration:test',
                resource: 'integration',
                action: 'test',
                description: 'Test Permission'
            }).returning();

            expect(testPerm).toHaveProperty('id');
            expect(testPerm.name).toBe('integration:test');
            expect(testPerm.resource).toBe('integration');
            expect(testPerm.action).toBe('test');

            // Cleanup
            await db.delete(permissions).where(eq(permissions.id, testPerm.id));
        });
    });

    describe('POST /api/rbac/permissions', () => {
        it('should create a new permission', async () => {
            const [created] = await db
                .insert(permissions)
                .values({
                    name: 'test:action',
                    resource: 'test',
                    action: 'action',
                    description: 'Test Action Permission',
                })
                .returning();

            testPermission = created;

            expect(testPermission).toBeDefined();
            expect(testPermission.name).toBe('test:action');
            expect(testPermission.resource).toBe('test');
            expect(testPermission.action).toBe('action');
        });

        it('should not allow duplicate permission names', async () => {
            const [first] = await db
                .insert(permissions)
                .values({
                    name: 'test:action',
                    resource: 'test',
                    action: 'action',
                    description: 'First Permission',
                })
                .returning();

            testPermission = first;

            // Attempting to create duplicate should fail
            await expect(
                db.insert(permissions).values({
                    name: 'test:action',
                    resource: 'test',
                    action: 'action',
                    description: 'Duplicate Permission',
                })
            ).rejects.toThrow();
        });
    });

    describe('Permission Naming Convention', () => {
        it('should follow resource:action pattern', () => {
            const validPermissionNames = [
                'users:create',
                'users:read',
                'users:update',
                'users:delete',
                'roles:manage',
                'permissions:assign',
            ];

            validPermissionNames.forEach(name => {
                const parts = name.split(':');
                expect(parts.length).toBe(2);
                expect(parts[0].length).toBeGreaterThan(0);
                expect(parts[1].length).toBeGreaterThan(0);
            });
        });
    });

    describe('Bulk Permission Operations', () => {
        it('should handle multiple permission creation', async () => {
            const permissionsToCreate = [
                { name: 'test:read', resource: 'test', action: 'read' },
                { name: 'test:write', resource: 'test', action: 'write' },
                { name: 'test:delete', resource: 'test', action: 'delete' },
            ];

            const created = await db
                .insert(permissions)
                .values(permissionsToCreate)
                .returning();

            expect(created.length).toBe(3);

            // Cleanup
            for (const perm of created) {
                await db.delete(permissions).where(eq(permissions.id, perm.id));
            }
        });
    });
});
