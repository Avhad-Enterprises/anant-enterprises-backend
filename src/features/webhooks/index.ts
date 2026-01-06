/**
 * Webhooks Route
 *
 * Handles external webhook endpoints (Razorpay, etc.)
 * These routes require special handling (raw body parsing, no auth).
 */

import { Router } from 'express';
import Route from '../../interfaces/route.interface';

class WebhooksRoute implements Route {
    public path = '/webhooks';
    public router = Router();

    constructor() {
        this.initializeRoutes();
    }

    private async initializeRoutes() {
        // Dynamic import
        const { default: razorpayWebhookHandler } = await import(
            '../payments/apis/webhook-handler'
        );

        // POST /webhooks/razorpay - Razorpay payment events
        // Note: Raw body parsing is handled in app.ts middleware
        this.router.use(`${this.path}/razorpay`, razorpayWebhookHandler);
    }
}

export default WebhooksRoute;
