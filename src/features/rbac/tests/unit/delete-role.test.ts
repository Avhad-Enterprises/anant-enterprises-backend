/**
 * Unit tests for Delete Role API
 * DELETE /api/rbac/roles/:roleId
 */

import request from 'supertest';
import app from '../../../../../tests/utils/app.helper';
import { dbHelper } from '../../../../../tests/utils/database.helper';
import { AuthTestHelper } from '../../../../../tests/utils/auth.helper';
import { db } from '../../../../database/drizzle';
import { roles, userRoles } from '../../shared/schema';
import { eq } from 'drizzle-orm';

describe('DELETE /api/rbac/roles/:roleId - Delete Role', () => {
    let superadminToken: string;
    let superadminUserId: number;
    let regularUserToken: string;
    let testUserId: number;
    let testRole: any;
    let systemRole: any;

    beforeAll(async () => {
        
        await AuthTestHelper.seedRBACData();

        const { token, userId } = await AuthTestHelper.createTestSuperadminUser();
        superadminToken = token;
        testUserId = userId;

        const { token: uToken } = await AuthTestHelper.createTestUserWithToken();
        regularUserToken = uToken;

        // Get a system role
        const [sysRole] = await db.select().from(roles).where(eq(roles.name, 'admin')).limit(1);
        systemRole = sysRole;
    });

    afterAll(async () => {
        
    });

    beforeEach(async () => {
        // Create test role
        const [role] = await db.insert(roles).values({
            name: 'test_delete_role',
            description: 'Role to be deleted',
            is_system_role: false,
            created_by: superadminUserId,
        }).returning();
        testRole = role;
    });

    afterEach(async () => {
        // Clean up if not deleted
        if (testRole) {
            const [existing] = await db.select().from(roles).where(eq(roles.id, testRole.id));
            if (existing) {
                await db.delete(roles).where(eq(roles.id, testRole.id));
            }
        }
    });

    describe('Successful Deletion', () => {
        it('should soft delete a role', async () => {
            const response = await request(app)
                .delete(`/api/rbac/roles/${testRole.id}`)
                .set('Authorization', `Bearer ${superadminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            // Verify soft delete
            const [deletedRole] = await db.select().from(roles).where(eq(roles.id, testRole.id));
            expect(deletedRole.is_deleted).toBe(true);
            expect(deletedRole.deleted_by).toBeDefined();
            expect(deletedRole.deleted_at).toBeDefined();
        });

        it('should set correct deleted_by field', async () => {
            await request(app)
                .delete(`/api/rbac/roles/${testRole.id}`)
                .set('Authorization', `Bearer ${superadminToken}`);

            const [deletedRole] = await db.select().from(roles).where(eq(roles.id, testRole.id));
            expect(deletedRole.deleted_by).toBe(testUserId);
        });
    });

    describe('System Role Protection', () => {
        it('should not allow deleting system roles', async () => {
            const response = await request(app)
                .delete(`/api/rbac/roles/${systemRole.id}`)
                .set('Authorization', `Bearer ${superadminToken}`);

            expect(response.status).toBe(400);
            expect(response.body.error?.message || response.body.message).toContain('Cannot delete system roles');
        });
    });

    describe('Validation Errors', () => {
        it('should reject non-existent role ID', async () => {
            const response = await request(app)
                .delete('/api/rbac/roles/99999')
                .set('Authorization', `Bearer ${superadminToken}`);

            expect(response.status).toBe(404);
            expect(response.body.error?.message || response.body.message).toContain('Role not found');
        });

        it('should not allow deleting role with assigned users', async () => {
            // Assign role to user
            await db.insert(userRoles).values({
                user_id: testUserId,
                role_id: testRole.id,
                assigned_by: superadminUserId,
            });

            const response = await request(app)
                .delete(`/api/rbac/roles/${testRole.id}`)
                .set('Authorization', `Bearer ${superadminToken}`);

            expect(response.status).toBe(400);
            expect(response.body.error?.message || response.body.message).toContain('user(s) are currently assigned to this role');

            // Cleanup
            await db.delete(userRoles).where(eq(userRoles.role_id, testRole.id));
        });
    });

    describe('Authentication & Authorization', () => {
        it('should reject unauthenticated requests', async () => {
            const response = await request(app)
                .delete(`/api/rbac/roles/${testRole.id}`);

            expect(response.status).toBe(401);
        });

        it('should reject requests without roles:manage permission', async () => {
            const response = await request(app)
                .delete(`/api/rbac/roles/${testRole.id}`)
                .set('Authorization', `Bearer ${regularUserToken}`);

            expect(response.status).toBe(403);
        });
    });
});
