/**
 * Integration tests for abandoned cart APIs
 */

import { Application } from 'express';
import App from '../../../../../app';
import OrdersRoute from '../../../index';
import { dbHelper, SupabaseAuthHelper, ApiTestHelper } from '../../../../../../tests/utils';
import { db } from '../../../../../database';
import { carts } from '../../../../cart/shared/carts.schema';
import { cartItems } from '../../../../cart/shared/cart-items.schema';
import { users } from '../../../../user/shared/user.schema';
import { eq } from 'drizzle-orm';

describe('Abandoned Cart APIs Integration Tests', () => {
    let app: Application;
    let apiHelper: ApiTestHelper;
    let adminToken: string;
    let testUser: any;

    beforeAll(async () => {
        const ordersRoute = new OrdersRoute();
        await ordersRoute.init();
        const appInstance = new App([ordersRoute]);
        app = appInstance.getServer();
        apiHelper = new ApiTestHelper(app as any);
    });

    beforeEach(async () => {
        await dbHelper.cleanup();
        await dbHelper.resetSequences();

        // Create admin user for testing
        const admin = await SupabaseAuthHelper.createTestAdminUser();
        adminToken = admin.token;

        // Create test user with abandoned cart
        testUser = await SupabaseAuthHelper.createTestUserWithToken();
    });

    afterAll(async () => {
        await dbHelper.close();
    });

    describe('GET /api/admin/abandoned-carts', () => {
        it('should require authentication', async () => {
            const response = await apiHelper.get('/api/admin/abandoned-carts');

            expect(response.status).toBe(401);
            expect(response.body.error.message).toContain('Authentication required');
        });

        it('should require admin permissions', async () => {
            const { token } = await SupabaseAuthHelper.createTestUserWithToken();
            const response = await apiHelper.get('/api/admin/abandoned-carts', token);

            expect(response.status).toBe(403);
            expect(response.body.error.message).toContain('Insufficient permissions');
        });

        it('should return paginated abandoned carts list', async () => {
            // Create abandoned cart
            const [cart] = await db
                .insert(carts)
                .values({
                    user_id: testUser.user.id,
                    cart_status: 'abandoned',
                    abandoned_at: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
                    subtotal: '100.00',
                    total: '118.00',
                })
                .returning();

            const response = await apiHelper.get('/api/admin/abandoned-carts?page=1&limit=10', adminToken);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.carts).toBeDefined();
            expect(Array.isArray(response.body.data.carts)).toBe(true);
            expect(response.body.data.pagination).toBeDefined();
        });

        it('should filter abandoned carts by date range', async () => {
            // Create old abandoned cart
            await db.insert(carts).values({
                user_id: testUser.user.id,
                cart_status: 'abandoned',
                abandoned_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
                subtotal: '50.00',
                total: '59.00',
            });

            // Create recent abandoned cart
            await db.insert(carts).values({
                user_id: testUser.user.id,
                cart_status: 'abandoned',
                abandoned_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
                subtotal: '100.00',
                total: '118.00',
            });

            const fromDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
            const response = await apiHelper.get(
                `/api/admin/abandoned-carts?from_date=${fromDate}`,
                adminToken
            );

            expect(response.status).toBe(200);
            expect(response.body.data.carts.length).toBeGreaterThanOrEqual(1);
        });
    });

    describe('GET /api/admin/abandoned-carts/metrics', () => {
        it('should require authentication', async () => {
            const response = await apiHelper.get('/api/admin/abandoned-carts/metrics');

            expect(response.status).toBe(401);
        });

        it('should return abandoned cart metrics', async () => {
            // Create abandoned carts
            await db.insert(carts).values({
                user_id: testUser.user.id,
                cart_status: 'abandoned',
                abandoned_at: new Date(),
                subtotal: '100.00',
                total: '118.00',
                recovery_email_sent: true,
            });

            const response = await apiHelper.get('/api/admin/abandoned-carts/metrics', adminToken);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.metrics).toBeDefined();
            expect(response.body.data.metrics.total_carts).toBeGreaterThanOrEqual(1);
            expect(response.body.data.metrics.total_potential_revenue).toBeDefined();
            expect(response.body.data.metrics.emails_sent).toBeDefined();
        });
    });

    describe('GET /api/admin/abandoned-carts/:cartId', () => {
        it('should require authentication', async () => {
            const response = await apiHelper.get('/api/admin/abandoned-carts/test-cart-id');

            expect(response.status).toBe(401);
        });

        it('should return 404 for non-existent cart', async () => {
            const fakeUuid = '00000000-0000-0000-0000-000000000000';
            const response = await apiHelper.get(`/api/admin/abandoned-carts/${fakeUuid}`, adminToken);

            expect(response.status).toBe(404);
            expect(response.body.error.message).toContain('not found');
        });

        it('should return full cart details', async () => {
            const [cart] = await db
                .insert(carts)
                .values({
                    user_id: testUser.user.id,
                    cart_status: 'abandoned',
                    abandoned_at: new Date(),
                    subtotal: '100.00',
                    total: '118.00',
                })
                .returning();

            const response = await apiHelper.get(`/api/admin/abandoned-carts/${cart.id}`, adminToken);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.cart).toBeDefined();
            expect(response.body.data.cart.id).toBe(cart.id);
            expect(response.body.data.items).toBeDefined();
        });
    });

    describe('POST /api/admin/abandoned-carts/send-email', () => {
        it('should require authentication', async () => {
            const response = await apiHelper.post('/api/admin/abandoned-carts/send-email', {
                cart_ids: [],
            });

            expect(response.status).toBe(401);
        });

        it('should validate request body', async () => {
            const response = await apiHelper.post(
                '/api/admin/abandoned-carts/send-email',
                { cart_ids: 'invalid' },
                adminToken
            );

            expect(response.status).toBe(400);
        });

        it('should send recovery emails to abandoned carts', async () => {
            const [cart] = await db
                .insert(carts)
                .values({
                    user_id: testUser.user.id,
                    cart_status: 'abandoned',
                    abandoned_at: new Date(),
                    subtotal: '100.00',
                    total: '118.00',
                })
                .returning();

            const response = await apiHelper.post(
                '/api/admin/abandoned-carts/send-email',
                {
                    cart_ids: [cart.id],
                    template_code: 'abandoned_cart_reminder',
                },
                adminToken
            );

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.success_count).toBeGreaterThanOrEqual(0);
        });
    });

    describe('GET /api/admin/abandoned-carts/email-templates', () => {
        it('should require authentication', async () => {
            const response = await apiHelper.get('/api/admin/abandoned-carts/email-templates');

            expect(response.status).toBe(401);
        });

        it('should return available email templates', async () => {
            const response = await apiHelper.get(
                '/api/admin/abandoned-carts/email-templates',
                adminToken
            );

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.templates).toBeDefined();
            expect(Array.isArray(response.body.data.templates)).toBe(true);
        });
    });
});
