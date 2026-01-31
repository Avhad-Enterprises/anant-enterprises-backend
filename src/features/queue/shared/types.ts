/**
 * Queue Event Types and Interfaces
 *
 * Defines all event types, payloads, and shared interfaces for the queue system.
 * Follows the pattern of audit/shared/types.ts
 */

import { QueueName } from './config';

/**
 * Event types enum
 * Defines all possible events in the system
 */
export enum QueueEventType {
  // Order events
  ORDER_CREATED = 'ORDER_CREATED',
  ORDER_CONFIRMED = 'ORDER_CONFIRMED',
  ORDER_PAID = 'ORDER_PAID',
  ORDER_SHIPPED = 'ORDER_SHIPPED',
  ORDER_DELIVERED = 'ORDER_DELIVERED',
  ORDER_CANCELLED = 'ORDER_CANCELLED',
  ORDER_REFUNDED = 'ORDER_REFUNDED',

  // Payment events
  PAYMENT_PENDING = 'PAYMENT_PENDING',
  PAYMENT_AUTHORIZED = 'PAYMENT_AUTHORIZED',
  PAYMENT_CAPTURED = 'PAYMENT_CAPTURED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  PAYMENT_REFUNDED = 'PAYMENT_REFUNDED',

  // Inventory events
  INVENTORY_RESERVED = 'INVENTORY_RESERVED',
  INVENTORY_RELEASED = 'INVENTORY_RELEASED',
  INVENTORY_ADJUSTED = 'INVENTORY_ADJUSTED',
  LOW_STOCK_ALERT = 'LOW_STOCK_ALERT',
  OUT_OF_STOCK_ALERT = 'OUT_OF_STOCK_ALERT',

  // Notification events
  SEND_EMAIL = 'SEND_EMAIL',
  SEND_SMS = 'SEND_SMS',

  // Invoice events
  GENERATE_INVOICE = 'GENERATE_INVOICE',
  INVOICE_GENERATED = 'INVOICE_GENERATED',
  INVOICE_SENT = 'INVOICE_SENT',

  // User events
  USER_REGISTERED = 'USER_REGISTERED',
  USER_EMAIL_VERIFIED = 'USER_EMAIL_VERIFIED',
  PASSWORD_RESET_REQUESTED = 'PASSWORD_RESET_REQUESTED',
}

/**
 * Base event interface
 * All events must extend this
 */
export interface BaseEvent {
  type: QueueEventType;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Generic queue event wrapper
 */
export interface QueueEvent<T = unknown> extends BaseEvent {
  data: T;
  queue: QueueName;
  priority?: number;
}

// ============================================
// INVOICE EVENT DATA INTERFACES
// ============================================

export interface GenerateInvoiceData {
  orderId: string;
  reason?: 'INITIAL' | 'CORRECTION' | 'REFUND';
  triggeredBy?: string; // userId or 'system'
}

export interface InvoiceGeneratedData {
  invoiceId: string;
  versionId: string;
  orderId: string;
  invoiceNumber: string;
  pdfUrl: string;
}

export interface InvoiceSentData {
  invoiceNumber: string;
  userEmail: string;
  sentAt: Date;
}

// ============================================
// ORDER EVENT DATA INTERFACES
// ============================================

export interface OrderItem {
  productId: string;
  variantId?: string;
  quantity: number;
  price: string;
  name: string;
}

export interface OrderCreatedData {
  orderId: string;
  orderNumber: string;
  userId: string;
  userEmail: string;
  userName: string;
  items: OrderItem[];
  subtotal: string;
  tax: string;
  shipping: string;
  total: string;
  currency: string;
  shippingAddress?: Record<string, unknown>;
  billingAddress?: Record<string, unknown>;
}

export interface OrderPaidData {
  orderId: string;
  orderNumber: string;
  userId: string;
  paymentId: string;
  paymentMethod: string;
  amount: string;
  currency: string;
  paidAt: Date;
}

export interface OrderShippedData {
  orderId: string;
  orderNumber: string;
  userId: string;
  userEmail: string;
  trackingNumber?: string;
  carrier?: string;
  estimatedDelivery?: Date;
}

export interface OrderCancelledData {
  orderId: string;
  orderNumber: string;
  userId: string;
  reason?: string;
  cancelledBy: string;
  items: OrderItem[];
}

// ============================================
// PAYMENT EVENT DATA INTERFACES
// ============================================

export interface PaymentProcessedData {
  paymentId: string;
  orderId: string;
  userId: string;
  amount: string;
  currency: string;
  paymentMethod: string;
  status: 'pending' | 'authorized' | 'captured' | 'failed';
  transactionId?: string;
  errorMessage?: string;
}

export interface PaymentRefundedData {
  paymentId: string;
  orderId: string;
  refundId: string;
  amount: string;
  currency: string;
  reason?: string;
  refundedAt: Date;
}

// ============================================
// INVENTORY EVENT DATA INTERFACES
// ============================================

export interface InventoryItem {
  productId: string;
  variantId?: string;
  quantity: number;
}

export interface InventoryReservedData {
  orderId: string;
  items: InventoryItem[];
  reservedBy: string;
  expiresAt?: Date;
}

export interface InventoryReleasedData {
  orderId: string;
  items: InventoryItem[];
  reason: 'cancelled' | 'expired' | 'manual';
  releasedBy: string;
}

export interface InventoryAdjustedData {
  productId: string;
  variantId?: string;
  oldQuantity: number;
  newQuantity: number;
  adjustmentType: 'manual' | 'damaged' | 'returned' | 'correction';
  adjustedBy: string;
  reason?: string;
}

export interface StockAlertData {
  productId: string;
  variantId?: string;
  productName: string;
  currentStock: number;
  threshold: number;
  alertType: 'low_stock' | 'out_of_stock';
}

// ============================================
// NOTIFICATION EVENT DATA INTERFACES
// ============================================

export interface EmailNotificationData {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  template?: string;
  templateData?: Record<string, unknown>;
  html?: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content?: string | Buffer;
    path?: string;
    contentType?: string;
  }>;
  priority?: number;
}

export interface SMSNotificationData {
  to: string;
  message: string;
  priority?: number;
}

// ============================================
// USER EVENT DATA INTERFACES
// ============================================

export interface UserRegisteredData {
  userId: string;
  email: string;
  name: string;
  registeredAt: Date;
}

// ============================================
// QUEUE STATUS INTERFACES
// ============================================

export interface QueueHealth {
  name: string;
  isHealthy: boolean;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
}

export interface JobInfo {
  id: string;
  name: string;
  data: unknown;
  opts: {
    attempts: number;
    delay?: number;
    timestamp: number;
  };
  progress: number | string | object | boolean;
  attemptsMade: number;
  failedReason?: string;
  stacktrace?: string[];
  returnvalue?: unknown;
  finishedOn?: number;
  processedOn?: number;
}

// ============================================
// WORKER INTERFACES
// ============================================

export interface WorkerHealth {
  name: string;
  isRunning: boolean;
  concurrency: number;
  processing: number;
  lastJobAt?: Date;
  errorCount: number;
}
