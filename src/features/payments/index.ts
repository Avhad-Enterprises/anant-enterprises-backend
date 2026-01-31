/**
 * Payments Feature Index
 *
 * Central exports for all payment-related functionality.
 * Registers all payment API routes.
 */

import { Router } from 'express';
import Route from '../../interfaces/route.interface';

class PaymentsRoute implements Route {
    public path = '/payments';
    public router = Router();

    constructor() {
        this.initializeRoutes();
    }

    private async initializeRoutes() {
        // Dynamic imports to avoid circular dependency with middlewares
        const { default: createPaymentOrderRouter } = await import('./apis/create-payment-order');
        const { default: verifyPaymentRouter } = await import('./apis/verify-payment');
        const { default: paymentStatusRouter } = await import('./apis/payment-status');
        const { default: retryPaymentRouter } = await import('./apis/retry-payment');
        const { default: initiateRefundRouter } = await import('./apis/initiate-refund');
        const { default: paymentHistoryRouter } = await import('./apis/payment-history');
        const { default: adminPaymentHistoryRouter } = await import('./apis/get-admin-payment-history');

        // Register routes
        // POST /payments/create-order - Create Razorpay order
        this.router.use(this.path, createPaymentOrderRouter);

        // POST /payments/verify - Verify payment signature
        this.router.use(this.path, verifyPaymentRouter);

        // GET /payments/:orderId/status - Get payment status
        this.router.use(this.path, paymentStatusRouter);

        // POST /payments/retry - Retry failed payment
        this.router.use(this.path, retryPaymentRouter);

        // POST /payments/refund - Initiate refund (admin)
        this.router.use(this.path, initiateRefundRouter);

        // GET /payments/transactions - Payment history (Current User)
        this.router.use(this.path, paymentHistoryRouter);

        // GET /payments/admin/payments/customer/:userId - Customer Transaction History (Admin)
        this.router.use(this.path, adminPaymentHistoryRouter);
    }
}

export default PaymentsRoute;

// Shared resources
export * from './shared';

// Services
export { RazorpayService } from './services/razorpay.service';
export { PaymentLockService } from './services/payment-lock.service';
