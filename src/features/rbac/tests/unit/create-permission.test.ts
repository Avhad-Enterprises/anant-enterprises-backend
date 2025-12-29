/**
 * Unit tests for Create Permission API
 * POST /api/rbac/permissions
 */

import request from 'supertest';
import app from '@tests/utils';
import { dbHelper } from '@tests/utils';
import { SupabaseAuthHelper } from '@tests/utils';
import { db } from '../../../../database';
import { permissions } from '../../shared/schema';
import { eq } from 'drizzle-orm';

describe('POST /api/rbac/permissions - Create Permission', () => {
    let superadminToken: string;
    let superadminUserId: number;
    let regularUserToken: string;

    beforeAll(async () => {
        
        await SupabaseAuthHelper.seedRBACData();

        // Create superadmin with permissions:assign permission
        const { token, userId } = await SupabaseAuthHelper.createTestSuperadminUser();
        superadminToken = token;
        superadminUserId = userId;

        // Debug: Check what permissions the superadmin has
        const { rbacCacheService } = await import('../../../../features/rbac/services/rbac-cache.service');
        const roles = await rbacCacheService.getUserRoles(superadminUserId);

        // Create regular user without permissions
        const { token: userToken } = await SupabaseAuthHelper.createTestUserWithToken();
        regularUserToken = userToken;
    });

    afterAll(async () => {
        
    });

    afterEach(async () => {
        // Clean up test permissions
        await db.delete(permissions).where(eq(permissions.name, 'test_resource:test_action'));
        await db.delete(permissions).where(eq(permissions.name, 'another:create'));
    });

    describe('Successful Creation', () => {
        it('should create a new permission with valid data', async () => {
            const permissionData = {
                name: 'test_resource:test_action',
                resource: 'test_resource',
                action: 'test_action',
                description: 'Test permission for unit testing',
            };

            const response = await request(app)
                .post('/api/rbac/permissions')
                .set('Authorization', `Bearer ${superadminToken}`)
                .send(permissionData);

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toMatchObject({
                name: 'test_resource:test_action',
                resource: 'test_resource',
                action: 'test_action',
                description: 'Test permission for unit testing',
            });
            expect(response.body.data.id).toBeDefined();
            expect(response.body.data.created_at).toBeDefined();
        });

        it('should create permission without description', async () => {
            const permissionData = {
                name: 'another:create',
                resource: 'another',
                action: 'create',
            };

            const response = await request(app)
                .post('/api/rbac/permissions')
                .set('Authorization', `Bearer ${superadminToken}`)
                .send(permissionData);

            expect(response.status).toBe(201);
            expect(response.body.data.name).toBe('another:create');
            expect(response.body.data.description).toBeNull();
        });
    });

    describe('Validation Errors', () => {
        it('should reject permission with duplicate name', async () => {
            const permissionData = {
                name: 'test_resource:test_action',
                resource: 'test_resource',
                action: 'test_action',
            };

            // Create first permission
            await request(app)
                .post('/api/rbac/permissions')
                .set('Authorization', `Bearer ${superadminToken}`)
                .send(permissionData);

            // Try to create duplicate
            const response = await request(app)
                .post('/api/rbac/permissions')
                .set('Authorization', `Bearer ${superadminToken}`)
                .send(permissionData);

            expect(response.status).toBe(409);
            expect(response.body.error?.message || response.body.message).toContain('already exists');
        });

        it('should reject permission name that does not match resource:action pattern', async () => {
            const permissionData = {
                name: 'wrong:name:format',
                resource: 'test_resource',
                action: 'test_action',
            };

            const response = await request(app)
                .post('/api/rbac/permissions')
                .set('Authorization', `Bearer ${superadminToken}`)
                .send(permissionData);

            expect(response.status).toBe(400);
            expect(response.body.error?.message || response.body.message).toContain('must match resource:action format');
        });

        it('should reject permission with invalid name format', async () => {
            const response = await request(app)
                .post('/api/rbac/permissions')
                .set('Authorization', `Bearer ${superadminToken}`)
                .send({
                    name: 'Invalid-Name:Action',
                    resource: 'test',
                    action: 'action',
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toBeTruthy();
        });

        it('should reject permission with invalid resource format', async () => {
            const response = await request(app)
                .post('/api/rbac/permissions')
                .set('Authorization', `Bearer ${superadminToken}`)
                .send({
                    name: 'Invalid-Resource:create',
                    resource: 'Invalid-Resource',
                    action: 'create',
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toBeTruthy();
        });

        it('should reject permission with invalid action format', async () => {
            const response = await request(app)
                .post('/api/rbac/permissions')
                .set('Authorization', `Bearer ${superadminToken}`)
                .send({
                    name: 'test:Invalid-Action',
                    resource: 'test',
                    action: 'Invalid-Action',
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toBeTruthy();
        });

        it('should reject empty name', async () => {
            const response = await request(app)
                .post('/api/rbac/permissions')
                .set('Authorization', `Bearer ${superadminToken}`)
                .send({
                    name: '',
                    resource: 'test',
                    action: 'create',
                });

            expect(response.status).toBe(400);
        });

        it('should reject too long name', async () => {
            const longName = 'a'.repeat(101) + ':action';
            const response = await request(app)
                .post('/api/rbac/permissions')
                .set('Authorization', `Bearer ${superadminToken}`)
                .send({
                    name: longName,
                    resource: 'test',
                    action: 'action',
                });

            expect(response.status).toBe(400);
        });
    });

    describe('Authentication & Authorization', () => {
        it('should reject unauthenticated requests', async () => {
            const response = await request(app)
                .post('/api/rbac/permissions')
                .send({
                    name: 'test:create',
                    resource: 'test',
                    action: 'create',
                });

            expect(response.status).toBe(401);
        });

        it('should reject requests without permissions:assign permission', async () => {
            const response = await request(app)
                .post('/api/rbac/permissions')
                .set('Authorization', `Bearer ${regularUserToken}`)
                .send({
                    name: 'test:create',
                    resource: 'test',
                    action: 'create',
                });

            expect(response.status).toBe(403);
        });
    });
});
