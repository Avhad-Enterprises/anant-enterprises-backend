/**
 * Payment Interfaces
 *
 * TypeScript interfaces for payment-related data structures.
 * Covers API requests/responses, Razorpay types, and internal types.
 */

// ============================================
// PAYMENT TRANSACTION INTERFACES
// ============================================

export interface IPaymentTransaction {
    id: string;
    order_id: string;
    razorpay_order_id: string;
    razorpay_payment_id?: string | null;
    razorpay_signature?: string | null;
    amount: string; // Decimal as string
    currency: string;
    status:
    | 'initiated'
    | 'authorized'
    | 'captured'
    | 'failed'
    | 'refund_initiated'
    | 'refunded'
    | 'partially_refunded';
    payment_method?: string | null;
    payment_method_details?: IPaymentMethodDetails | null;
    error_code?: string | null;
    error_description?: string | null;
    error_source?: string | null;
    error_step?: string | null;
    error_reason?: string | null;
    refund_id?: string | null;
    refund_amount?: string | null;
    refund_reason?: string | null;
    refunded_at?: Date | null;
    webhook_verified: boolean;
    webhook_received_at?: Date | null;
    idempotency_key?: string | null;
    created_at: Date;
    updated_at: Date;
    verified_at?: Date | null;
}

// ============================================
// PAYMENT METHOD DETAILS
// ============================================

export interface ICardPaymentDetails {
    card_id?: string;
    network: string; // Visa, Mastercard, etc.
    last4: string;
    issuer?: string; // Bank name
    type: 'credit' | 'debit' | 'prepaid';
    international?: boolean;
    emi?: boolean;
}

export interface IUPIPaymentDetails {
    vpa: string; // UPI ID (e.g., name@upi)
    flow?: 'collect' | 'intent';
    transaction_reference?: string;
}

export interface INetbankingPaymentDetails {
    bank_code: string;
    bank_name: string;
}

export interface IWalletPaymentDetails {
    wallet: string; // paytm, phonepe, freecharge, etc.
    status?: string;
}

export type IPaymentMethodDetails =
    | ICardPaymentDetails
    | IUPIPaymentDetails
    | INetbankingPaymentDetails
    | IWalletPaymentDetails;

// ============================================
// WEBHOOK INTERFACES
// ============================================

export interface IPaymentWebhookLog {
    id: string;
    event_id?: string | null;
    event_type: string;
    razorpay_order_id?: string | null;
    razorpay_payment_id?: string | null;
    raw_payload: Record<string, unknown>;
    signature_verified: boolean;
    processed: boolean;
    processed_at?: Date | null;
    processing_error?: string | null;
    retry_count: number;
    received_at: Date;
}

// ============================================
// API REQUEST/RESPONSE INTERFACES
// ============================================

// Create Payment Order
export interface ICreatePaymentOrderRequest {
    order_id: string; // Internal order UUID
    payment_method: 'razorpay' | 'cod';
    save_payment_method?: boolean;
}

export interface ICreatePaymentOrderResponse {
    razorpay_order_id: string;
    razorpay_key_id: string;
    amount: number; // Amount in paise
    currency: string;
    order_id: string;
    order_number: string;
    prefill: {
        name?: string;
        email?: string;
        contact?: string;
    };
    notes: {
        order_id: string;
        order_number: string;
    };
    theme: {
        color: string;
    };
}

// Verify Payment
export interface IVerifyPaymentRequest {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
}

export interface IVerifyPaymentResponse {
    order_id: string;
    order_number: string;
    payment_status: 'paid' | 'authorized';
    transaction_id: string;
    paid_at: string;
    amount_paid: number;
}

// Payment Status
export interface IPaymentStatusResponse {
    order_id: string;
    order_number: string;
    payment_status: string;
    order_status: string;
    total_amount: number;
    currency: string;
    payment_method?: string;
    razorpay_order_id?: string;
    payment_attempts: number;
    last_payment_error?: string;
    transactions: IPaymentTransactionSummary[];
}

export interface IPaymentTransactionSummary {
    id: string;
    razorpay_payment_id?: string;
    amount: number;
    status: string;
    payment_method?: string;
    error_description?: string;
    created_at: string;
}

// Initiate Refund (Admin)
export interface IInitiateRefundRequest {
    order_id: string;
    amount?: number; // Partial refund amount (full if omitted)
    reason: string;
    refund_speed?: 'normal' | 'optimum';
}

export interface IRefundResponse {
    refund_id: string;
    payment_id: string;
    amount: number;
    currency: string;
    status: 'processed' | 'pending';
    speed_requested: string;
    speed_processed?: string;
    created_at: string;
}

// Payment History
export interface IPaymentHistoryResponse {
    transactions: IPaymentTransactionSummary[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        total_pages: number;
    };
}

// ============================================
// RAZORPAY WEBHOOK EVENT TYPES
// ============================================

export interface IRazorpayWebhookEvent {
    entity: 'event';
    account_id: string;
    event: string;
    contains: string[];
    payload: {
        payment?: {
            entity: IRazorpayPaymentEntity;
        };
        refund?: {
            entity: IRazorpayRefundEntity;
        };
        order?: {
            entity: IRazorpayOrderEntity;
        };
    };
    created_at: number;
}

export interface IRazorpayPaymentEntity {
    id: string;
    entity: 'payment';
    amount: number;
    currency: string;
    status: 'created' | 'authorized' | 'captured' | 'refunded' | 'failed';
    order_id: string;
    invoice_id?: string;
    method: 'card' | 'upi' | 'netbanking' | 'wallet' | 'emi';
    description?: string;
    bank?: string;
    wallet?: string;
    vpa?: string;
    email?: string;
    contact?: string;
    notes?: Record<string, string>;
    fee?: number;
    tax?: number;
    error_code?: string;
    error_description?: string;
    error_source?: string;
    error_step?: string;
    error_reason?: string;
    card?: {
        id: string;
        name?: string;
        last4: string;
        network: string;
        type: string;
        issuer?: string;
    };
    created_at: number;
}

export interface IRazorpayRefundEntity {
    id: string;
    entity: 'refund';
    amount: number;
    currency: string;
    payment_id: string;
    notes?: Record<string, string>;
    status: 'pending' | 'processed' | 'failed';
    speed_requested: 'normal' | 'optimum';
    speed_processed?: 'normal' | 'optimum' | 'instant';
    created_at: number;
}

export interface IRazorpayOrderEntity {
    id: string;
    entity: 'order';
    amount: number;
    amount_paid: number;
    amount_due: number;
    currency: string;
    receipt?: string;
    status: 'created' | 'attempted' | 'paid';
    notes?: Record<string, string>;
    created_at: number;
}

// ============================================
// ERROR TYPES
// ============================================

export type PaymentErrorCode =
    | 'ORDER_NOT_FOUND'
    | 'ORDER_ALREADY_PAID'
    | 'ORDER_CANCELLED'
    | 'INVALID_ORDER_STATUS'
    | 'INVALID_SIGNATURE'
    | 'PAYMENT_NOT_FOUND'
    | 'VERIFICATION_FAILED'
    | 'MAX_RETRIES_EXCEEDED'
    | 'REFUND_NOT_ALLOWED'
    | 'REFUND_AMOUNT_EXCEEDED'
    | 'RATE_LIMIT_EXCEEDED';

export interface IPaymentError {
    code: PaymentErrorCode;
    details?: string;
    recoverable?: boolean;
}
