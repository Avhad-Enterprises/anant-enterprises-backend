/**
 * Integration tests for RBAC Role APIs
 * Tests full API flows using supertest
 */

import request from 'supertest';
import app from '../../../../../tests/utils';
import { AuthTestHelper } from '../../../../../tests/utils';
import { db } from '../../../../database';
import { roles, rolePermissions, userRoles } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { rbacCacheService } from '../../services/rbac-cache.service';

describe('RBAC Role APIs - Integration Tests', () => {
    let superadminToken: string;
    let superadminUserId: number;
    let adminToken: string;
    let regularUserToken: string;

    beforeAll(async () => {
        await AuthTestHelper.seedRBACData();

        const { token: saToken, userId: saUserId } = await AuthTestHelper.createTestSuperadminUser();
        superadminToken = saToken;
        superadminUserId = saUserId;

        const { token: aToken } = await AuthTestHelper.createTestAdminUser();
        adminToken = aToken;

        const { token: uToken } = await AuthTestHelper.createTestUserWithToken();
        regularUserToken = uToken;
    });

    afterEach(async () => {
        // Clean up test roles created during tests
        await db.delete(roles).where(eq(roles.name, 'integration_test_role'));
        await db.delete(roles).where(eq(roles.name, 'flow_test_role'));
        await rbacCacheService.invalidateAll();
    });

    describe('Complete Role Lifecycle', () => {
        it('should complete full role CRUD lifecycle via API', async () => {
            // 1. CREATE role
            const createResponse = await request(app)
                .post('/api/rbac/roles')
                .set('Authorization', `Bearer ${superadminToken}`)
                .send({
                    name: 'integration_test_role',
                    description: 'Integration test role',
                });

            expect(createResponse.status).toBe(201);
            expect(createResponse.body.success).toBe(true);
            const createdRoleId = createResponse.body.data.id;

            // 2. READ role (via list)
            const listResponse = await request(app)
                .get('/api/rbac/roles')
                .set('Authorization', `Bearer ${superadminToken}`);

            expect(listResponse.status).toBe(200);
            const foundRole = listResponse.body.data.find((r: any) => r.id === createdRoleId);
            expect(foundRole).toBeDefined();
            expect(foundRole.name).toBe('integration_test_role');

            // 3. UPDATE role
            const updateResponse = await request(app)
                .put(`/api/rbac/roles/${createdRoleId}`)
                .set('Authorization', `Bearer ${superadminToken}`)
                .send({
                    description: 'Updated integration test role',
                });

            expect(updateResponse.status).toBe(200);
            expect(updateResponse.body.data.description).toBe('Updated integration test role');

            // 4. DELETE role
            const deleteResponse = await request(app)
                .delete(`/api/rbac/roles/${createdRoleId}`)
                .set('Authorization', `Bearer ${superadminToken}`);

            expect(deleteResponse.status).toBe(200);
        });
    });

    describe('Role with Permissions Flow', () => {
        it('should create role and assign permissions via API', async () => {
            // Create role
            const createResponse = await request(app)
                .post('/api/rbac/roles')
                .set('Authorization', `Bearer ${superadminToken}`)
                .send({
                    name: 'flow_test_role',
                    description: 'Role for permission flow test',
                });

            expect(createResponse.status).toBe(201);
            const roleId = createResponse.body.data.id;

            // Get available permissions
            const permissionsResponse = await request(app)
                .get('/api/rbac/permissions')
                .set('Authorization', `Bearer ${superadminToken}`);

            expect(permissionsResponse.status).toBe(200);
            const permissions = permissionsResponse.body.data.permissions;
            expect(permissions.length).toBeGreaterThan(0);

            // Assign permission to role (use first available permission)
            const permissionId = permissions[0].id;
            const assignResponse = await request(app)
                .post(`/api/rbac/roles/${roleId}/permissions`)
                .set('Authorization', `Bearer ${superadminToken}`)
                .send({ permission_id: permissionId });

            expect(assignResponse.status).toBe(200);

            // Verify permissions are assigned
            const rolePermissionsResponse = await request(app)
                .get(`/api/rbac/roles/${roleId}/permissions`)
                .set('Authorization', `Bearer ${superadminToken}`);

            expect(rolePermissionsResponse.status).toBe(200);
            expect(rolePermissionsResponse.body.data.permissions.length).toBeGreaterThan(0);

            // Clean up
            await request(app)
                .delete(`/api/rbac/roles/${roleId}`)
                .set('Authorization', `Bearer ${superadminToken}`);
        });
    });

    describe('Authorization Enforcement', () => {
        it('should enforce authentication for all role endpoints', async () => {
            const endpoints = [
                { method: 'get', path: '/api/rbac/roles' },
                { method: 'post', path: '/api/rbac/roles' },
                { method: 'put', path: '/api/rbac/roles/1' },
                { method: 'delete', path: '/api/rbac/roles/1' },
            ];

            for (const endpoint of endpoints) {
                const response = await (request(app) as any)[endpoint.method](endpoint.path);
                expect(response.status).toBe(401);
            }
        });

        it('should enforce proper permissions for role management', async () => {
            // Regular user should not be able to create roles
            const createResponse = await request(app)
                .post('/api/rbac/roles')
                .set('Authorization', `Bearer ${regularUserToken}`)
                .send({
                    name: 'unauthorized_role',
                    description: 'Should not be created',
                });

            expect(createResponse.status).toBe(403);
        });

        it('should allow admin to read roles', async () => {
            const response = await request(app)
                .get('/api/rbac/roles')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
        });
    });

    describe('System Role Protection', () => {
        it('should prevent deletion of system roles via API', async () => {
            // Get admin role (system role)
            const [adminRole] = await db.select().from(roles).where(eq(roles.name, 'admin')).limit(1);

            const response = await request(app)
                .delete(`/api/rbac/roles/${adminRole.id}`)
                .set('Authorization', `Bearer ${superadminToken}`);

            expect(response.status).toBe(400);
            expect(response.body.error?.message || response.body.message).toContain('system role');
        });

        it('should prevent renaming system roles via API', async () => {
            const [adminRole] = await db.select().from(roles).where(eq(roles.name, 'admin')).limit(1);

            const response = await request(app)
                .put(`/api/rbac/roles/${adminRole.id}`)
                .set('Authorization', `Bearer ${superadminToken}`)
                .send({ name: 'hacked_admin' });

            expect(response.status).toBe(400);
        });
    });
});
