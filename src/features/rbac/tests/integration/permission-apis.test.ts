/**
 * Integration tests for RBAC Permission APIs
 * Tests full API flows using supertest
 */

import request from 'supertest';
import app from '@tests/utils';
import { SupabaseAuthHelper } from '@tests/utils';
import { db } from '../../../../database';
import { permissions, roles, rolePermissions } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { rbacCacheService } from '../../services/rbac-cache.service';

describe('RBAC Permission APIs - Integration Tests', () => {
    let superadminToken: string;
    let adminToken: string;
    let regularUserToken: string;

    beforeAll(async () => {
        await SupabaseAuthHelper.seedRBACData();

        const { token: saToken, userId: saUserId } = await SupabaseAuthHelper.createTestSuperadminUser();
        superadminToken = saToken;

        const { token: aToken } = await SupabaseAuthHelper.createTestAdminUser();
        adminToken = aToken;

        const { token: uToken } = await SupabaseAuthHelper.createTestUserWithToken();
        regularUserToken = uToken;
    });

    afterEach(async () => {
        // Clean up test permissions
        await db.delete(permissions).where(eq(permissions.name, 'integration:test'));
        await db.delete(permissions).where(eq(permissions.name, 'flow:test'));
        await db.delete(permissions).where(eq(permissions.name, 'bulk:one'));
        await db.delete(permissions).where(eq(permissions.name, 'bulk:two'));
        await db.delete(permissions).where(eq(permissions.name, 'bulk:three'));
        await rbacCacheService.invalidateAll();
    });

    describe('Permission Retrieval', () => {
        it('should retrieve all permissions grouped by resource via API', async () => {
            const response = await request(app)
                .get('/api/rbac/permissions')
                .set('Authorization', `Bearer ${superadminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            // Response has permissions array and by_resource object
            expect(response.body.data).toHaveProperty('permissions');
            expect(response.body.data).toHaveProperty('by_resource');
            expect(Array.isArray(response.body.data.permissions)).toBe(true);

            // Should have seeded permissions
            expect(response.body.data.permissions.length).toBeGreaterThan(0);

            // Verify permission structure
            const firstPerm = response.body.data.permissions[0];
            expect(firstPerm).toHaveProperty('id');
            expect(firstPerm).toHaveProperty('name');
            expect(firstPerm).toHaveProperty('resource');
            expect(firstPerm).toHaveProperty('action');
        });

        it('should include wildcard permission for superadmin', async () => {
            const response = await request(app)
                .get('/api/rbac/permissions')
                .set('Authorization', `Bearer ${superadminToken}`);

            expect(response.status).toBe(200);
            const wildcardPerm = response.body.data.permissions.find((p: any) => p.name === '*');
            expect(wildcardPerm).toBeDefined();
        });
    });

    describe('Permission Creation', () => {
        it('should create permission with valid resource:action format via API', async () => {
            const response = await request(app)
                .post('/api/rbac/permissions')
                .set('Authorization', `Bearer ${superadminToken}`)
                .send({
                    name: 'integration:test',
                    resource: 'integration',
                    action: 'test',
                    description: 'Integration test permission',
                });

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data.name).toBe('integration:test');
        });

        it('should reject duplicate permission names via API', async () => {
            // Create first
            await request(app)
                .post('/api/rbac/permissions')
                .set('Authorization', `Bearer ${superadminToken}`)
                .send({
                    name: 'integration:test',
                    resource: 'integration',
                    action: 'test',
                });

            // Try duplicate
            const response = await request(app)
                .post('/api/rbac/permissions')
                .set('Authorization', `Bearer ${superadminToken}`)
                .send({
                    name: 'integration:test',
                    resource: 'integration',
                    action: 'test',
                });

            expect(response.status).toBe(409);
        });

        it('should reject invalid permission format via API', async () => {
            const response = await request(app)
                .post('/api/rbac/permissions')
                .set('Authorization', `Bearer ${superadminToken}`)
                .send({
                    name: 'Invalid-Format',
                    resource: 'test',
                    action: 'test',
                });

            expect(response.status).toBe(400);
        });
    });

    describe('Bulk Permission Assignment', () => {
        it('should bulk assign permissions to role via API', async () => {
            // Create test permissions
            const perm1 = await request(app)
                .post('/api/rbac/permissions')
                .set('Authorization', `Bearer ${superadminToken}`)
                .send({ name: 'bulk:one', resource: 'bulk', action: 'one' });

            const perm2 = await request(app)
                .post('/api/rbac/permissions')
                .set('Authorization', `Bearer ${superadminToken}`)
                .send({ name: 'bulk:two', resource: 'bulk', action: 'two' });

            const perm3 = await request(app)
                .post('/api/rbac/permissions')
                .set('Authorization', `Bearer ${superadminToken}`)
                .send({ name: 'bulk:three', resource: 'bulk', action: 'three' });

            // Create test role
            const roleResponse = await request(app)
                .post('/api/rbac/roles')
                .set('Authorization', `Bearer ${superadminToken}`)
                .send({ name: 'bulk_test_role', description: 'Bulk test' });

            const roleId = roleResponse.body.data.id;

            // Bulk assign
            const bulkResponse = await request(app)
                .post(`/api/rbac/roles/${roleId}/permissions/bulk`)
                .set('Authorization', `Bearer ${superadminToken}`)
                .send({
                    permission_ids: [
                        perm1.body.data.id,
                        perm2.body.data.id,
                        perm3.body.data.id,
                    ],
                });

            expect(bulkResponse.status).toBe(200);
            expect(bulkResponse.body.data.assigned_count).toBe(3);
            expect(bulkResponse.body.data.skipped_count).toBe(0);

            // Clean up
            await db.delete(rolePermissions).where(eq(rolePermissions.role_id, roleId));
            await db.delete(roles).where(eq(roles.id, roleId));
        });
    });

    describe('Authorization Enforcement', () => {
        it('should require authentication for permission endpoints', async () => {
            const response = await request(app).get('/api/rbac/permissions');
            expect(response.status).toBe(401);
        });

        it('should require permissions:read for GET', async () => {
            const response = await request(app)
                .get('/api/rbac/permissions')
                .set('Authorization', `Bearer ${regularUserToken}`);

            expect(response.status).toBe(403);
        });

        it('should require permissions:assign for POST', async () => {
            const response = await request(app)
                .post('/api/rbac/permissions')
                .set('Authorization', `Bearer ${regularUserToken}`)
                .send({
                    name: 'unauthorized:test',
                    resource: 'unauthorized',
                    action: 'test',
                });

            expect(response.status).toBe(403);
        });

        it('should allow admin to read permissions', async () => {
            const response = await request(app)
                .get('/api/rbac/permissions')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
        });
    });
});
