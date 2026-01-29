/**
 * Unit tests for Order Service
 */

import { orderService } from '../../../services/order.service';
import { db } from '../../../../../database';
import { orders } from '../../../shared/orders.schema';
import { discountCodes } from '../../../../discount/shared/discount-codes.schema';
import { discounts } from '../../../../discount/shared/discount.schema';

jest.mock('../../../../../database');

describe('OrderService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('generateOrderNumber', () => {
        it('should generate order number with current year', async () => {
            const mockDb = db as jest.Mocked<typeof db>;
            mockDb.select = jest.fn().mockReturnValue({
                from: jest.fn().mockReturnValue({
                    where: jest.fn().mockResolvedValue([{ count: 5 }]),
                }),
            });

            const orderNumber = await orderService.generateOrderNumber();
            const currentYear = new Date().getFullYear().toString().slice(-2);

            expect(orderNumber).toMatch(/^ORD-\d{2}-\d{6}$/);
            expect(orderNumber).toContain(`ORD-${currentYear}`);
        });

        it('should pad order number with leading zeros', async () => {
            const mockDb = db as jest.Mocked<typeof db>;
            mockDb.select = jest.fn().mockReturnValue({
                from: jest.fn().mockReturnValue({
                    where: jest.fn().mockResolvedValue([{ count: 0 }]),
                }),
            });

            const orderNumber = await orderService.generateOrderNumber();

            expect(orderNumber).toMatch(/ORD-\d{2}-000001$/);
        });
    });

    describe('calculateGST', () => {
        it('should calculate CGST and SGST for intra-state transaction', () => {
            const result = orderService.calculateGST(1000, 'Maharashtra', 'Maharashtra', false);

            expect(result.cgst).toBe(90); // 9%
            expect(result.sgst).toBe(90); // 9%
            expect(result.igst).toBe(0);
            expect(result.taxAmount).toBe(180); // 18%
        });

        it('should calculate IGST for inter-state transaction', () => {
            const result = orderService.calculateGST(1000, 'Maharashtra', 'Gujarat', false);

            expect(result.cgst).toBe(0);
            expect(result.sgst).toBe(0);
            expect(result.igst).toBe(180); // 18%
            expect(result.taxAmount).toBe(180);
        });

        it('should return zero tax for international orders', () => {
            const result = orderService.calculateGST(1000, 'Maharashtra', 'USA', true);

            expect(result.cgst).toBe(0);
            expect(result.sgst).toBe(0);
            expect(result.igst).toBe(0);
            expect(result.taxAmount).toBe(0);
        });

        it('should be case-insensitive for state comparison', () => {
            const result = orderService.calculateGST(1000, 'maharashtra', 'MAHARASHTRA', false);

            expect(result.cgst).toBe(90);
            expect(result.sgst).toBe(90);
            expect(result.igst).toBe(0);
        });
    });

    describe('validateOrder', () => {
        it('should validate order with all required fields', () => {
            const orderData = {
                items: [{ product_id: '1', quantity: 1 }],
                user_id: 'user-123',
                shipping_address_line1: '123 Test St',
                billing_address_line1: '123 Billing St',
                total_amount: 100,
            };

            const result = orderService.validateOrder(orderData);

            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should fail validation with no items', () => {
            const orderData = {
                items: [],
                user_id: 'user-123',
                shipping_address_line1: '123 Test St',
                billing_address_line1: '123 Billing St',
                total_amount: 100,
            };

            const result = orderService.validateOrder(orderData);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Order must have at least one item');
        });

        it('should fail validation with no customer info', () => {
            const orderData = {
                items: [{ product_id: '1', quantity: 1 }],
                shipping_address_line1: '123 Test St',
                billing_address_line1: '123 Billing St',
                total_amount: 100,
            };

            const result = orderService.validateOrder(orderData);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Order must have a customer or billing email');
        });

        it('should fail validation with missing addresses', () => {
            const orderData = {
                items: [{ product_id: '1', quantity: 1 }],
                user_id: 'user-123',
                total_amount: 100,
            };

            const result = orderService.validateOrder(orderData);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Shipping address is required');
            expect(result.errors).toContain('Billing address is required');
        });

        it('should accept billing email instead of user_id', () => {
            const orderData = {
                items: [{ product_id: '1', quantity: 1 }],
                billing_email: 'test@example.com',
                shipping_address_line1: '123 Test St',
                billing_address_line1: '123 Billing St',
                total_amount: 100,
            };

            const result = orderService.validateOrder(orderData);

            expect(result.isValid).toBe(true);
        });
    });

    describe('calculateOrderPricing', () => {
        it('should calculate pricing for simple order', async () => {
            const input = {
                items: [
                    {
                        product_id: '1',
                        product_name: 'Test Product',
                        product_sku: 'TEST-001',
                        quantity: 2,
                        unit_price: 100,
                        cost_price: 50,
                    },
                ],
                shipping_amount: 50,
                shipping_state: 'Maharashtra',
                billing_state: 'Maharashtra',
            };

            const result = await orderService.calculateOrderPricing(input);

            expect(result.subtotal).toBe(200); // 2 × 100
            expect(result.total_quantity).toBe(2);
            expect(result.shipping_amount).toBe(50);
            // With 18% GST on 200: 36
            expect(result.tax_amount).toBe(36);
            expect(result.total_amount).toBe(286); // 200 + 50 + 36
        });

        it('should apply item-level discounts', async () => {
            const input = {
                items: [
                    {
                        product_id: '1',
                        product_name: 'Test Product',
                        product_sku: 'TEST-001',
                        quantity: 1,
                        unit_price: 100,
                        cost_price: 50,
                        discount_percentage: 10,
                    },
                ],
                shipping_amount: 0,
                shipping_state: 'Maharashtra',
                billing_state: 'Maharashtra',
            };

            const result = await orderService.calculateOrderPricing(input);

            expect(result.items[0].discount_amount).toBe(10);
            expect(result.items[0].line_subtotal).toBe(100);
            // Line after discount: 90, tax: 16.2, total: 106.2
            expect(result.items[0].line_total).toBeCloseTo(106.2, 1);
        });

        it('should handle multiple items', async () => {
            const input = {
                items: [
                    {
                        product_id: '1',
                        product_name: 'Product 1',
                        product_sku: 'TEST-001',
                        quantity: 2,
                        unit_price: 100,
                        cost_price: 50,
                    },
                    {
                        product_id: '2',
                        product_name: 'Product 2',
                        product_sku: 'TEST-002',
                        quantity: 1,
                        unit_price: 50,
                        cost_price: 25,
                    },
                ],
                shipping_amount: 0,
                shipping_state: 'Maharashtra',
                billing_state: 'Maharashtra',
            };

            const result = await orderService.calculateOrderPricing(input);

            expect(result.subtotal).toBe(250); // (2 × 100) + (1 × 50)
            expect(result.total_quantity).toBe(3);
            expect(result.items).toHaveLength(2);
        });
    });
});
