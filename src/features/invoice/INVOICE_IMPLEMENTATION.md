# Invoice Generation System - Technical Implementation Guide

This document provides a comprehensive overview of the invoice generation feature, designed to assist with Admin Panel integration and future maintenance.

## 1. The Bird's Eye View (The Flow)

**Concept:**
1.  **Customer pays** (Payment Captured).
2.  **Kitchen gets a ticket** (Event Trigger).
3.  **Chef cooks & plates** (Invoice Generation & PDF Creation).
4.  **Waiter delivers** (Storage & Notification).

```ascii
[ User Pays ]  --->  [ Razorpay Webhook ]
                          |
                          v
                 [ Backend "Listener" ]
                 (Detects Payment Success)
                          |
                          v
                 [ Event Bus (Pub/Sub) ]
            "Hey! Order #123 is PAID. Make an Invoice!"
                          |
                          v
               [ Invoice Service (The Chef) ]
               1. Fetch Order Data
               2. Calculate Taxes (GST)
               3. Draw PDF (using Config) <--- [ invoice.config.ts ]
               4. Save PDF to Cloud
                          |
                          v
                 [ Database & Notification ]
            "Invoice #INV-001 Ready at url..."
```

---

## 2. Breakdown by File (Where the Magic Happens)

### A. The Trigger: `webhook-handler.ts`
**Location:** `src/features/payments/apis/webhook-handler.ts`
**Role:** The Security Guard (Listener).

It processing the `payment.captured` event from Razorpay.

```ascii
File: src/features/payments/apis/webhook-handler.ts

+------------------------------------------------+
|  IF event == "payment.captured"                |
|     1. Verify the signature (Security Check)   |
|     2. Mark Order as "CONFIRMED" in DB         |
|     3. EMIT: "publishGenerateInvoice(...)"     | ---> Sends Event
+------------------------------------------------+
```
*   **Layman:** "I see money in the bank. Start the paperwork!"
*   **Technical:** Validates webhook signature, ensures idempotency, updates `orders` table status, and emits a domain event to decouple payment logic from invoice generation.

### B. The Architect: `invoice.service.ts`
**Location:** `src/features/invoice/services/invoice.service.ts`
**Role:** The Chef (Worker).

This service converts raw data into the final PDF document.

```ascii
File: src/features/invoice/services/invoice.service.ts

   [ Event Received ]
          |
          v
+-----------------------------+
|  generateInvoice(orderId)   |
|                             |
|  1. GET Data from DB        | (Order, Items, Addresses)
|  2. CALC Math               | (Subtotal + GST Logic)
|  3. GENERATE PDF Buffer     | (Draws pixels using PDFKit)
|       ^                     |
|       | uses                |
|  [ invoice.config.ts ]      | (Configuration/Toggles)
|                             |
|  4. UPLOAD to Supabase      | (S3-compatible storage)
|  5. SAVE URL to DB          | (Updates 'invoice_versions' table)
+-----------------------------+
```
*   **Layman:** It gathers the ingredients (items), calculates the bill, draws the PDF according to the design rules, and files it away in the cloud.
*   **Technical:** Orchestrates data fetching, invokes `PDFKit` for document generation (using absolute positioning), uploads to Supabase Storage, and manages database transactions for data consistency.

### C. The Rulebook: `invoice.config.ts`
**Location:** `src/features/invoice/invoice.config.ts`
**Role:** The Style Guide (Configuration).

Controls the appearance and content of the PDF without changing code.

```typescript
// File: src/features/invoice/invoice.config.ts

export const invoiceConfig = {
   // Toggle visibility
   showGSTIN: true,           
   showTimeOfSupply: true,
   
   // Static Content
   terms: ["No Refunds", "Return within 7 days"],
   greeting: "Thank You!",
   
   // Layout
   colors: { primary: "black" } 
};
```
*   **Layman:** The settings menu. Hide the GST number? Change the greeting? Do it here.
*   **Technical:** A centralized configuration object that controls conditional rendering logic and injects static constants into the PDF generation process.

### D. The Backup Plan: `get-order-invoice.ts`
**Location:** `src/features/invoice/apis/get-order-invoice.ts`
**Role:** The Fail-Safe (Lazy Loader).

Ensures an invoice is always provided if the order is paid, even if the initial trigger failed.

```ascii
File: src/features/invoice/apis/get-order-invoice.ts

User asks: "GET /api/orders/:id/invoices/latest"

+------------------------------------------+
|  Check DB: Invoice exists?               |
|     YES -> Return it immediately.        |
|     NO  -> Is Order PAID?                |
|             YES -> Create it NOW! (Lazy) | ---> Calls Invoice Service
|             NO  -> 404 Not Found         |
+------------------------------------------+
```
*   **Layman:** "You want the receipt? Let me check... Oh, we missed printing it earlier? Since you paid, I'll print one for you right now."
*   **Technical:** A REST Endpoint implementing a "Lazy Loading" pattern. It acts as a self-healing mechanism to ensure availability of invoices for paid orders, handling potential race conditions or missed webhook events.

## 3. Integration for Admin Panel

When integrating into the Admin Panel:
1.  **List View:** Use the `orders` table to show payment status.
2.  **Detail View:** Call `GET /api/orders/:id/invoices/latest` to retrieve the invoice.
    *   If the invoice was generated, you get the URL immediately.
    *   If it wasn't (e.g., missed webhook), this call will trigger generation automatically (latency ~1-2s).
3.  **Download:** Use the `version.pdf_url` from the response to open the file directly from Supabase CDN.
