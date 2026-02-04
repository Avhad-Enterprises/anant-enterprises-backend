/**
 * API Client for Tests
 * Simulates frontend API calls with proper authentication
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

const BASE_URL = (process.env.API_BASE_URL || 'http://localhost:8000') + '/api';

export interface ApiClientOptions {
    token?: string;
    sessionId?: string;
}

export class TestApiClient {
    private client: AxiosInstance;
    private token?: string;
    private sessionId?: string;

    constructor(options: ApiClientOptions = {}) {
        this.token = options.token;
        this.sessionId = options.sessionId;

        this.client = axios.create({
            baseURL: BASE_URL,
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }

    setToken(token: string) {
        this.token = token;
    }

    setSessionId(sessionId: string) {
        this.sessionId = sessionId;
    }

    private getHeaders(): Record<string, string> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        if (this.sessionId) {
            headers['x-session-id'] = this.sessionId;
        }

        return headers;
    }

    // ============================================
    // AUTH APIs
    // ============================================

    async login(email: string, password: string) {
        const response = await this.client.post('/auth/login', {
            email,
            password,
        });

        // Auto-set token for subsequent requests
        if (response.data.data?.token) {
            this.setToken(response.data.data.token);
        }

        return response.data;
    }

    async register(data: {
        email: string;
        password: string;
        phone: string;
        first_name: string;
        last_name: string;
    }) {
        const response = await this.client.post('/auth/register', data);
        return response.data;
    }

    // ============================================
    // CART APIs
    // ============================================

    async getCart() {
        const response = await this.client.get('/cart', {
            headers: this.getHeaders(),
        });
        return response.data;
    }

    async addToCart(productId: string, quantity: number, variantId?: string) {
        const response = await this.client.post('/cart/items', {
            product_id: productId,
            variant_id: variantId,
            quantity,
        }, {
            headers: this.getHeaders(),
        });
        return response.data;
    }

    async updateCartItem(itemId: string, quantity: number) {
        const response = await this.client.patch(`/cart/items/${itemId}`, {
            quantity,
        }, {
            headers: this.getHeaders(),
        });
        return response.data;
    }

    async removeCartItem(itemId: string) {
        const response = await this.client.delete(`/cart/items/${itemId}`, {
            headers: this.getHeaders(),
        });
        return response.data;
    }

    // ============================================
    // ORDER APIs
    // ============================================

    async createOrder(data: {
        shipping_address_id: string;
        billing_address_id?: string;
        payment_method: 'razorpay' | 'cod';
        discount_code?: string;
    }) {
        const response = await this.client.post('/orders', data, {
            headers: this.getHeaders(),
        });
        return response.data;
    }

    async getOrders() {
        const response = await this.client.get('/orders', {
            headers: this.getHeaders(),
        });
        return response.data;
    }

    async getOrderById(orderId: string) {
        const response = await this.client.get(`/orders/${orderId}`, {
            headers: this.getHeaders(),
        });
        return response.data;
    }

    async cancelOrder(orderId: string, reason?: string) {
        const response = await this.client.post(`/orders/${orderId}/cancel`, {
            reason,
        }, {
            headers: this.getHeaders(),
        });
        return response.data;
    }

    // ============================================
    // PAYMENT APIs
    // ============================================

    async createRazorpayOrder(orderId: string) {
        const response = await this.client.post('/payments/razorpay/create', {
            order_id: orderId,
        }, {
            headers: this.getHeaders(),
        });
        return response.data;
    }

    async verifyRazorpayPayment(data: {
        order_id: string;
        razorpay_payment_id: string;
        razorpay_order_id: string;
        razorpay_signature: string;
    }) {
        const response = await this.client.post('/payments/razorpay/verify', data, {
            headers: this.getHeaders(),
        });
        return response.data;
    }

    async processCodPayment(orderId: string) {
        const response = await this.client.post('/payments/cod/process', {
            order_id: orderId,
        }, {
            headers: this.getHeaders(),
        });
        return response.data;
    }

    // ============================================
    // PRODUCT APIs
    // ============================================

    async getProducts(params?: {
        search?: string;
        category?: string;
        page?: number;
        limit?: number;
    }) {
        const response = await this.client.get('/products', {
            params,
            headers: this.getHeaders(),
        });
        return response.data;
    }

    async getProductById(productId: string) {
        const response = await this.client.get(`/products/${productId}`, {
            headers: this.getHeaders(),
        });
        return response.data;
    }

    // ============================================
    // INVENTORY APIs
    // ============================================

    async getAvailableStock(productId: string) {
        const response = await this.client.get(`/inventory/product/${productId}/available`, {
            headers: this.getHeaders(),
        });
        return response.data;
    }

    async adjustInventory(inventoryId: string, data: {
        quantity_change: number;
        reason: string;
        reference_number?: string;
        notes?: string;
    }) {
        const response = await this.client.post(`/admin/inventory/${inventoryId}/adjust`, data, {
            headers: this.getHeaders(),
        });
        return response.data;
    }

    async getInventoryHistory(inventoryId: string, limit = 50) {
        const response = await this.client.get(`/admin/inventory/${inventoryId}/history`, {
            params: { limit },
            headers: this.getHeaders(),
        });
        return response.data;
    }

    // ============================================
    // ADDRESS APIs
    // ============================================

    async getAddresses() {
        const response = await this.client.get('/addresses', {
            headers: this.getHeaders(),
        });
        return response.data;
    }

    async createAddress(data: {
        address_type: 'home' | 'office' | 'other';
        full_name: string;
        phone: string;
        address_line_1: string;
        city: string;
        state: string;
        pincode: string;
        country: string;
        is_default?: boolean;
    }) {
        const response = await this.client.post('/addresses', data, {
            headers: this.getHeaders(),
        });
        return response.data;
    }

    // ============================================
    // GENERIC REQUEST (for custom endpoints)
    // ============================================

    async request<T = any>(config: AxiosRequestConfig): Promise<T> {
        const response = await this.client.request({
            ...config,
            headers: {
                ...this.getHeaders(),
                ...config.headers,
            },
        });
        return response.data;
    }
}

// ============================================
// FACTORY: Create API Client
// ============================================

export function createApiClient(options?: ApiClientOptions): TestApiClient {
    return new TestApiClient(options);
}

// ============================================
// HELPER: Login and Get Token
// ============================================

export async function loginAndGetToken(email: string, password: string): Promise<string> {
    const client = createApiClient();
    const response = await client.login(email, password);

    if (!response.data?.token) {
        throw new Error('Login failed: No token received');
    }

    return response.data.token;
}
