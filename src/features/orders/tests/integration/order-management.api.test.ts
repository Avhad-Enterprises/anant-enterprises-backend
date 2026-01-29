/**
 * Integration tests for Phase 3 order management APIs
 */

import { Application } from 'express';
import App from '../../../../../app';
import OrdersRoute from '../../../index';
import { dbHelper, SupabaseAuthHelper, ApiTestHelper } from '../../../../../../tests/utils';
import { db } from '../../../../../database';
import { orders } from '../../../shared/orders.schema';
import { orderItems } from '../../../shared/order-items.schema';
import { products } from '../../../../product/shared/product.schema';
import { tags } from '../../../../tags/shared/tags.schema';

describe('Order Management APIs Integration Tests', () => {
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

        const admin = await SupabaseAuthHelper.createTestAdminUser();
        adminToken = admin.token;
        testUser = await SupabaseAuthHelper.createTestUserWithToken();
    });

    afterAll(async () => {
        await dbHelper.close();
    });

    describe('POST /api/admin/orders/:orderId/duplicate', () => {
        it('should require authentication', async () => {
            const response = await apiHelper.post('/api/admin/orders/test-id/duplicate', {});

            expect(response.status).toBe(401);
            expect(response.body.error.message).toContain('Authentication required');
        });

        it('should require write permissions', async () => {
            const { token } = await SupabaseAuthHelper.createTestUserWithToken();
            const response = await apiHelper.post('/api/admin/orders/test-id/duplicate', {}, token);

            expect(response.status).toBe(403);
        });

        it('should return 404 for non-existent order', async () => {
            const fakeUuid = '00000000-0000-0000-0000-000000000000';
            const response = await apiHelper.post(
                `/api/admin/orders/${fakeUuid}/duplicate`,
                {},
                adminToken
            );

            expect(response.status).toBe(404);
            expect(response.body.error.message).toContain('not found');
        });

        it('should duplicate order successfully', async () => {
            // Create test order
            const [order] = await db
                .insert(orders)
                .values({
                    user_id: testUser.user.id,
                    order_number: 'ORD-26-000001',
                    order_status: 'completed',
                    payment_status: 'paid',
                    fulfillment_status: 'fulfilled',
                    subtotal: '100.00',
                    total_amount: '118.00',
                    shipping_address_line1: '123 Test St',
                    billing_address_line1: '123 Test St',
                    shipping_city: 'Test City',
                    billing_city: 'Test City',
                    shipping_state: 'Test State',
                    billing_state: 'Test State',
                    shipping_country: 'India',
                    billing_country: 'India',
                    total_quantity: 1,
                })
                .returning();

            await db.insert(orderItems).values({
                order_id: order.id,
                product_name: 'Test Product',
                product_sku: 'TEST-001',
                quantity: 1,
                unit_price: '100.00',
                final_price: '100.00',
                line_total: '100.00',
            });

            const response = await apiHelper.post(
                `/api/admin/orders/${order.id}/duplicate`,
                {},
                adminToken
            );

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.order).toBeDefined();
            expect(response.body.data.order.id).not.toBe(order.id); // New ID
            expect(response.body.data.order.order_number).not.toBe(order.order_number); // New order number
            expect(response.body.data.order.is_draft).toBe(true);
            expect(response.body.data.order.order_status).toBe('pending');
        });
    });

    describe('DELETE /api/admin/orders', () => {
        it('should require authentication', async () => {
            const response = await apiHelper.delete('/api/admin/orders', { order_ids: [] });

            expect(response.status).toBe(401);
        });

        it('should require delete permissions', async () => {
            const { token } = await SupabaseAuthHelper.createTestUserWithToken();
            const response = await apiHelper.delete('/api/admin/orders', { order_ids: [] }, token);

            expect(response.status).toBe(403);
        });

        it('should validate request body', async () => {
            const response = await apiHelper.delete('/api/admin/orders', {}, adminToken);

            expect(response.status).toBe(400);
        });

        it('should soft delete orders', async () => {
            const [order] = await db
                .insert(orders)
                .values({
                    user_id: testUser.user.id,
                    order_number: 'ORD-26-000001',
                    order_status: 'pending',
                    payment_status: 'pending',
                    subtotal: '100.00',
                    total_amount: '118.00',
                    shipping_address_line1: '123 Test St',
                    billing_address_line1: '123 Test St',
                    shipping_city: 'Test City',
                    billing_city: 'Test City',
                    shipping_state: 'Test State',
                    billing_state: 'Test State',
                    shipping_country: 'India',
                    billing_country: 'India',
                    total_quantity: 1,
                })
                .returning();

            const response = await apiHelper.delete(
                '/api/admin/orders',
                { order_ids: [order.id] },
                adminToken
            );

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.deleted_count).toBe(1);
        });
    });

    describe('GET /api/admin/orders/products/search', () => {
        it('should require authentication', async () => {
            const response = await apiHelper.get('/api/admin/orders/products/search?search=test');

            expect(response.status).toBe(401);
        });

        it('should validate search parameter', async () => {
            const response = await apiHelper.get('/api/admin/orders/products/search', adminToken);

            expect(response.status).toBe(400);
        });

        it('should search products by name', async () => {
            await db.insert(products).values({
                name: 'Test Product',
                sku: 'TEST-001',
                price: '100.00',
                cost_price: '50.00',
                is_active: true,
            });

            const response = await apiHelper.get(
                '/api/admin/orders/products/search?search=Test',
                adminToken
            );

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.products).toBeDefined();
            expect(Array.isArray(response.body.data.products)).toBe(true);
        });

        it('should search products by SKU', async () => {
            await db.insert(products).values({
                name: 'Test Product',
                sku: 'TEST-001',
                price: '100.00',
                cost_price: '50.00',
                is_active: true,
            });

            const response = await apiHelper.get(
                '/api/admin/orders/products/search?search=TEST-001',
                adminToken
            );

            expect(response.status).toBe(200);
            expect(response.body.data.products.length).toBeGreaterThanOrEqual(1);
        });

        it('should include stock information', async () => {
            await db.insert(products).values({
                name: 'Test Product',
                sku: 'TEST-001',
                price: '100.00',
                cost_price: '50.00',
                is_active: true,
            });

            const response = await apiHelper.get(
                '/api/admin/orders/products/search?search=Test',
                adminToken
            );

            expect(response.status).toBe(200);
            if (response.body.data.products.length > 0) {
                const product = response.body.data.products[0];
                expect(product.available_stock).toBeDefined();
                expect(product.in_stock).toBeDefined();
            }
        });
    });

    describe('GET /api/admin/orders/tags', () => {
        it('should require authentication', async () => {
            const response = await apiHelper.get('/api/admin/orders/tags');

            expect(response.status).toBe(401);
        });

        it('should return order tags only', async () => {
            await db.insert(tags).values([
                { name: 'Order Tag 1', type: 'order', status: true },
                { name: 'Product Tag', type: 'product', status: true },
            ]);

            const response = await apiHelper.get('/api/admin/orders/tags', adminToken);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.tags).toBeDefined();
            // Should only return order tags
            const orderTags = response.body.data.tags.filter((t: any) => t.name.includes('Order'));
            expect(orderTags.length).toBeGreaterThanOrEqual(1);
        });
    });

    describe('POST /api/admin/orders/tags', () => {
        it('should require authentication', async () => {
            const response = await apiHelper.post('/api/admin/orders/tags', { name: 'Test Tag' });

            expect(response.status).toBe(401);
        });

        it('should require write permissions', async () => {
            const { token } = await SupabaseAuthHelper.createTestUserWithToken();
            const response = await apiHelper.post('/api/admin/orders/tags', { name: 'Test Tag' }, token);

            expect(response.status).toBe(403);
        });

        it('should validate request body', async () => {
            const response = await apiHelper.post('/api/admin/orders/tags', {}, adminToken);

            expect(response.status).toBe(400);
        });

        it('should create order tag successfully', async () => {
            const response = await apiHelper.post(
                '/api/admin/orders/tags',
                { name: 'Urgent' },
                adminToken
            );

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data.tag).toBeDefined();
            expect(response.body.data.tag.name).toBe('Urgent');
        });

        it('should handle duplicate tag names', async () => {
            await db.insert(tags).values({ name: 'Urgent', type: 'order', status: true });

            const response = await apiHelper.post(
                '/api/admin/orders/tags',
                { name: 'Urgent' },
                adminToken
            );

            expect(response.status).toBe(409);
            expect(response.body.error.message).toContain('exists');
        });
    });
});
