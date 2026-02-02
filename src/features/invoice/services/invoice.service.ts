import { sql, eq, and } from 'drizzle-orm';
import { db } from '../../../database';
import {
  invoices,
  invoiceVersions,
  invoiceLineItems,
  type NewInvoice,
  type NewInvoiceVersion,
  type NewInvoiceLineItem,
} from '../shared/invoice.schema';
import { orders } from '../../orders/shared/orders.schema';
import { orderItems } from '../../orders/shared/order-items.schema';
import { products } from '../../product/shared/product.schema';
import { users } from '../../user/shared/user.schema';
import { userAddresses } from '../../user/shared/addresses.schema';
import { HttpException, logger } from '../../../utils';
import PDFKit from 'pdfkit';
import { uploadToStorage } from '../../../utils/supabaseStorage';
import { numberToWords } from '../../../utils/numberToWords';

/**
 * Invoice Service
 * Business logic for invoice generation and management
 */
export class InvoiceService {
  /**
   * Generate invoice number in format: INV-YYYY-MM-000001
   */
  private async generateInvoiceNumber(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');

    // Get count of invoices this month
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(invoices)
      .where(sql`${invoices.invoice_number} LIKE ${`INV-${year}-${month}-%`}`);

    const count = countResult[0].count || 0;
    const sequence = String(count + 1).padStart(6, '0');

    return `INV-${year}-${month}-${sequence}`;
  }

  /**
   * Calculate GST breakdown based on billing and shipping addresses
   */
  private calculateGST(
    subtotal: number,
    billingState: string,
    shippingState: string
  ): {
    cgst: number;
    sgst: number;
    igst: number;
    taxAmount: number;
  } {
    const GST_RATE = 0.18; // 18% GST
    const taxAmount = subtotal * GST_RATE;

    if (billingState.toLowerCase() === shippingState.toLowerCase()) {
      // Intra-state: CGST + SGST (50% each)
      const cgst = taxAmount / 2;
      const sgst = taxAmount / 2;
      return { cgst, sgst, igst: 0, taxAmount };
    }

    // Inter-state: IGST (100%)
    return { cgst: 0, sgst: 0, igst: taxAmount, taxAmount };
  }

  /**
   * Generate PDF content for invoice
   */
  private generatePDFContent(
    invoice: any,
    order: any,
    items: any[],
    billingAddress: any,
    shippingAddress: any,
    user: any
  ): Promise<Buffer> {
    return new Promise(resolve => {
      const doc = new PDFKit({ margin: 50, size: 'A4' });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      // Import config
      const { invoiceConfig: config } = require('./config/invoice.config');

      // Base Y position
      let yPos = 50;
      const leftMargin = 40;
      const contentWidth = 515;
      const rightMargin = 555;

      // --- 1. Header Box ---
      // Draw outer box for company details
      doc
        .lineWidth(1)
        .rect(leftMargin, yPos - 10, contentWidth, 85)
        .stroke();

      let headerY = yPos + 5;

      // Company Name
      doc
        .font('Helvetica-Bold')
        .fontSize(config.layout.fontSize.header)
        .text(config.company.name, leftMargin, headerY, { align: 'center', width: contentWidth });

      headerY += 20;

      // GSTIN
      doc.font('Helvetica').fontSize(config.layout.fontSize.body);
      if (config.company.showGSTIN && config.company.gstin) {
        doc.text(`GSTIN: ${config.company.gstin}`, leftMargin, headerY, {
          align: 'center',
          width: contentWidth,
        });
        headerY += 13;
      }

      // Address
      doc.text(config.company.address, leftMargin, headerY, {
        align: 'center',
        width: contentWidth,
      });
      headerY += 13;

      // Email
      doc.text(`Email: ${config.company.email}`, leftMargin, headerY, {
        align: 'center',
        width: contentWidth,
      });

      // Move Y past the box
      yPos += 95;

      // --- 2. Title Section ---
      yPos += 15;
      doc
        .font('Helvetica-Bold')
        .fontSize(config.layout.fontSize.subHeader)
        .text(config.header.title, leftMargin, yPos, { align: 'center', width: contentWidth });

      yPos += 20;
      // Separator Line
      doc.moveTo(leftMargin, yPos).lineTo(rightMargin, yPos).stroke();

      // --- 3. Invoice Meta Data (Horizontal) ---
      yPos += 10;
      doc.font('Helvetica-Bold').fontSize(config.layout.fontSize.body);

      const invoiceDate = new Date(invoice.created_at).toLocaleDateString('en-IN');
      const placeOfSupply = invoice.version?.place_of_supply || 'MH';

      const metaY = yPos;
      doc.text(`Invoice No: ${invoice.invoice_number}`, leftMargin, metaY);
      doc.text(`Date: ${invoiceDate}`, 250, metaY);

      if (config.header.showPlaceOfSupply) {
        doc.text(`Place: ${placeOfSupply}`, 450, metaY);
      }

      if (config.header.showTimeOfSupply) {
        // Display time below Date
        const invoiceTime = new Date(invoice.created_at).toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
        });
        doc.text(`Time: ${invoiceTime}`, 250, metaY + 13);
      }

      yPos += 30; // Increased spacing to accommodate potential Time field

      // --- 4. Bill To Section ---
      // Fix: Use billingAddress object if available (hybrid support)
      const addrLine1 = billingAddress?.address_line1 || order.billing_address_line1;
      const addrLine2 = billingAddress?.address_line2 || order.billing_address_line2;
      const city = billingAddress?.city || order.billing_city;
      const state = billingAddress?.state_province || order.billing_state;
      const zip = billingAddress?.postal_code || order.billing_pin_code;

      const addressLines = [
        addrLine1,
        addrLine2,
        city && state ? `${city}, ${state} ${zip || ''}` : null,
      ].filter(line => line && line !== 'undefined' && line.trim() !== '');

      const customerName =
        billingAddress?.recipient_name ||
        order.billing_name ||
        order.shipping_name ||
        'Valued Customer';

      yPos += 10;
      doc
        .font('Helvetica-Bold')
        .fontSize(config.layout.fontSize.body)
        .text('BILL TO:', leftMargin, yPos);

      yPos += 15;
      doc.font('Helvetica').fontSize(config.layout.fontSize.body);
      doc.text(customerName, leftMargin, yPos);
      yPos += 13;

      addressLines.forEach(line => {
        doc.text(line!, leftMargin, yPos);
        yPos += 13;
      });

      if (config.client.showEmail && user.email) {
        doc.text(`Email: ${user.email}`, leftMargin, yPos);
        yPos += 13;
      }

      if (config.client.showPhone && order.billing_phone) {
        doc.text(`Phone: ${order.billing_phone}`, leftMargin, yPos);
        yPos += 13;
      }

      if (config.client.showGSTIN && order.customer_gstin) {
        doc.text(`GSTIN: ${order.customer_gstin}`, leftMargin, yPos);
        yPos += 13;
      }

      // --- 5. Table Layout & Headers ---
      yPos += 15;
      doc.moveTo(leftMargin, yPos).lineTo(rightMargin, yPos).stroke();

      // Dynamic Column Calculation (keeping fixed logic but respecting toggles for now)
      const cols = {
        sl: 40,
        desc: 70,
        hsn: 220,
        qty: 280,
        unit: 330,
        rate: 390,
        disc: 430,
        taxable: 490,
      };

      yPos += 10;
      doc.font('Helvetica-Bold').fontSize(config.layout.fontSize.small);

      if (config.table.showSlNo) doc.text('Sl', cols.sl, yPos).text('No', cols.sl, yPos + 10);

      doc.text('Item Description', cols.desc, yPos);

      if (config.table.showHSN) doc.text('HSN', cols.hsn, yPos).text('Code', cols.hsn, yPos + 10);

      doc.text('Qty', cols.qty, yPos);

      if (config.table.showUnit)
        doc.text('Unit', cols.unit, yPos).text('Price', cols.unit, yPos + 10);

      if (config.table.showRate)
        doc.text('Rate', cols.rate, yPos).text('%', cols.rate + 5, yPos + 10);

      if (config.table.showDiscount) doc.text('Discount', cols.disc, yPos);

      if (config.table.showTaxableValue)
        doc.text('Taxable', cols.taxable, yPos).text('Value', cols.taxable, yPos + 10);

      yPos += 25;
      doc.moveTo(leftMargin, yPos).lineTo(rightMargin, yPos).stroke();

      // --- 6. Table Rows ---
      yPos += 15;
      doc.font('Helvetica').fontSize(config.layout.fontSize.small);

      let subtotal = 0;

      items.forEach((item, index) => {
        const unitPrice = Number(item.unit_price);
        const qty = item.quantity;
        const discountAmt = 0;
        const taxableValue = unitPrice * qty - discountAmt;
        subtotal += taxableValue;

        const taxRate = Number(item.tax_rate || 18);
        const taxAmount = taxableValue * (taxRate / 100);

        // State Check Logic for Inter/Intra
        const shippingState = (
          shippingAddress?.state_province ||
          order.shipping_state ||
          ''
        ).toLowerCase();
        const homeStateKeys = ['maharashtra', 'mh', 'pune'];
        const isIntraState = homeStateKeys.some(k => shippingState.includes(k));

        const rowStartY = yPos;

        if (config.table.showSlNo) doc.text(String(index + 1), cols.sl, yPos);

        doc.text(item.product_name, cols.desc, yPos, { width: 140 });

        if (config.table.showHSN) doc.text(item.hsn_code || '8471', cols.hsn, yPos);

        doc.text(String(qty), cols.qty, yPos);

        if (config.table.showUnit) doc.text(unitPrice.toFixed(2), cols.unit, yPos);

        if (config.table.showRate) doc.text(`${taxRate}%`, cols.rate, yPos);

        if (config.table.showDiscount) doc.text(discountAmt.toFixed(2), cols.disc, yPos);

        if (config.table.showTaxableValue) {
          doc.text(taxableValue.toFixed(2), cols.taxable, yPos, { align: 'right', width: 60 });
        }

        // Tax Breakdown
        let taxYPos = yPos + 12; // Start below the main row text

        // Ensure tax breakdown doesn't overlap with next row if description is short
        // Calc description height again to be safe
        const descHeight = doc.heightOfString(item.product_name, { width: 140 });

        doc.fontSize(8.5).fillColor(config.layout.colors.secondary);

        if (isIntraState) {
          if (config.summary.showCGSTSGST) {
            const halfRate = taxRate / 2;
            const halfTax = taxAmount / 2;
            doc.text(`CGST (${halfRate}%): ${halfTax.toFixed(2)}`, cols.taxable - 20, taxYPos, {
              align: 'right',
              width: 80,
            });
            taxYPos += 10;
            doc.text(`SGST (${halfRate}%): ${halfTax.toFixed(2)}`, cols.taxable - 20, taxYPos, {
              align: 'right',
              width: 80,
            });
            // Should verify if taxYPos needs another increment or if logic handles it
          }
        } else {
          if (config.summary.showIGST) {
            doc.text(`IGST (${taxRate}%): ${taxAmount.toFixed(2)}`, cols.taxable - 20, taxYPos, {
              align: 'right',
              width: 80,
            });
          }
        }

        // Advance yPos
        // We need the MAX of (Introduction + Desc Height) OR (Tax Breakdown Height)
        // Tax breakdown ends at taxYPos + 10 (approx)
        const rowContentBottom = Math.max(rowStartY + descHeight, taxYPos + 10);
        yPos = rowContentBottom + 10; // Add padding

        doc.fontSize(config.layout.fontSize.small).fillColor(config.layout.colors.primary);
      });

      // --- 7. Summary ---
      yPos += 10;
      doc.moveTo(leftMargin, yPos).lineTo(rightMargin, yPos).stroke();

      yPos += 20;
      doc
        .font('Helvetica-Bold')
        .fontSize(12)
        .text('SUMMARY', leftMargin, yPos, { align: 'center', width: contentWidth });

      yPos += 20;
      doc.moveTo(leftMargin, yPos).lineTo(rightMargin, yPos).stroke();

      // Calculate Totals
      yPos += 20;
      const taxBreakdown = this.calculateGST(
        subtotal,
        billingAddress?.state_province || order.billing_state || '',
        shippingAddress?.state_province || order.shipping_state || ''
      );
      const shippingAmount = Number(order.shipping_amount || 0);
      const grandTotal = subtotal + taxBreakdown.taxAmount + shippingAmount;

      const summaryLabelX = 350;
      const summaryValueX = 480;

      doc.font('Helvetica').fontSize(10);

      // Subtotal
      if (config.summary.showSubtotal) {
        doc.text('Subtotal:', summaryLabelX, yPos);
        doc.text(subtotal.toFixed(2), summaryValueX, yPos, { align: 'right' });
        yPos += 15;
      }

      // Discount
      if (config.summary.showDiscount) {
        doc.text('Discount:', summaryLabelX, yPos);
        doc.text((Number(order.discount_amount || 0) * -1).toFixed(2), summaryValueX, yPos, {
          align: 'right',
        });
        yPos += 15;
      }

      // Taxable Value
      if (config.summary.showTaxableValue) {
        doc.text('Taxable Value:', summaryLabelX, yPos);
        doc.text(subtotal.toFixed(2), summaryValueX, yPos, { align: 'right' });
        yPos += 20;
      }

      // Taxes Breakdown
      if (config.summary.showTaxBreakdown) {
        if (taxBreakdown.cgst > 0 && config.summary.showCGSTSGST) {
          doc.text('CGST:', summaryLabelX, yPos);
          doc.text(taxBreakdown.cgst.toFixed(2), summaryValueX, yPos, { align: 'right' });
          yPos += 15;
          doc.text('SGST:', summaryLabelX, yPos);
          doc.text(taxBreakdown.sgst.toFixed(2), summaryValueX, yPos, { align: 'right' });
          yPos += 15;
        } else if (taxBreakdown.igst > 0 && config.summary.showIGST) {
          doc.text('IGST:', summaryLabelX, yPos);
          doc.text(taxBreakdown.igst.toFixed(2), summaryValueX, yPos, { align: 'right' });
          yPos += 15;
        }
      }

      // Total Tax
      if (config.summary.showTotalTax) {
        doc.text('Total Tax:', summaryLabelX, yPos);
        doc.text(taxBreakdown.taxAmount.toFixed(2), summaryValueX, yPos, { align: 'right' });
        yPos += 15;
      }

      // Shipping
      if (config.summary.showShipping && shippingAmount > 0) {
        doc.text('Shipping:', summaryLabelX, yPos);
        doc.text(shippingAmount.toFixed(2), summaryValueX, yPos, { align: 'right' });
        yPos += 15;
      }

      yPos += 10;
      doc.moveTo(summaryLabelX, yPos).lineTo(rightMargin, yPos).stroke();
      yPos += 10;

      doc.font('Helvetica-Bold').fontSize(12);
      doc.text('GRAND TOTAL:', summaryLabelX, yPos);
      doc.text(grandTotal.toFixed(2), summaryValueX, yPos, { align: 'right' });

      // --- 8. Footer ---
      yPos += 30;

      // Amount in Words
      if (config.footer.showAmountInWords) {
        doc.font('Helvetica-Oblique').fontSize(10);
        const amountWords = numberToWords(Math.round(grandTotal));
        doc.text(`Amount in Words: ${amountWords}`, leftMargin, yPos);
        yPos += 20;
      }

      // Terms
      if (config.footer.termsAndConditions && config.footer.termsAndConditions.length > 0) {
        doc.font('Helvetica').fontSize(9);
        doc.text('Terms & Conditions:', leftMargin, yPos);
        yPos += 12;
        config.footer.termsAndConditions.forEach((term: string) => {
          doc.text(`${term}`, leftMargin, yPos);
          yPos += 12;
        });
      }

      // Greeting
      if (config.footer.greeting) {
        yPos += 30;
        doc
          .font('Helvetica-Bold')
          .fontSize(11)
          .text(config.footer.greeting, leftMargin, yPos, { align: 'center', width: contentWidth });
      }

      // Authorized Signatory
      if (config.footer.showAuthorizedSignatory) {
        // Position at bottom right
        const signifyY = yPos; // Align with greeting or slightly below
        doc
          .font('Helvetica')
          .fontSize(9)
          .text('For ANANT ENTERPRISES', 400, signifyY, { align: 'right', width: 155 });
        doc.text('Authorized Signatory', 400, signifyY + 35, { align: 'right', width: 155 });
      }

      doc.end();
    });
  }

  /**
   * Generate invoice for order
   */
  async generateInvoice(orderId: string): Promise<any> {
    try {
      logger.info('Generating invoice for order', { orderId });

      // Get order details with addresses
      const orderDetails = await db.query.orders.findFirst({
        where: eq(orders.id, orderId),
        with: {
          shippingAddress: true,
          billingAddress: true,
        },
      });

      if (!orderDetails) {
        throw new HttpException(404, 'Order not found');
      }

      const order = orderDetails;

      // Check if invoice already exists
      const [existingInvoice] = await db
        .select()
        .from(invoices)
        .where(eq(invoices.order_id, orderId));

      if (existingInvoice) {
        logger.info('Invoice already exists for order', { orderId });
        return this.getLatestInvoiceForOrder(orderId);
      }

      // Get order items with HSN from products
      const orderItemsResult = await db
        .select({
          id: orderItems.id,
          order_id: orderItems.order_id,
          product_id: orderItems.product_id,
          product_name: orderItems.product_name,
          sku: orderItems.sku,
          quantity: orderItems.quantity,
          cost_price: orderItems.cost_price,
          unit_price: orderItems.cost_price, // map cost_price to unit_price for invoice
          hsn_code: products.hsn_code,
        })
        .from(orderItems)
        .leftJoin(products, eq(orderItems.product_id, products.id))
        .where(eq(orderItems.order_id, orderId));

      // Get user details
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, order.user_id || ''));

      // Get billing and shipping addresses
      let billingAddress = null;
      let shippingAddress = null;

      if (order.billing_address_id) {
        [billingAddress] = await db
          .select()
          .from(userAddresses)
          .where(eq(userAddresses.id, order.billing_address_id));
      }

      if (order.shipping_address_id) {
        [shippingAddress] = await db
          .select()
          .from(userAddresses)
          .where(eq(userAddresses.id, order.shipping_address_id));
      }

      // Generate invoice number
      const invoiceNumber = await this.generateInvoiceNumber();

      // Calculate totals
      let subtotal = 0;
      orderItemsResult.forEach(item => {
        subtotal += item.quantity * parseFloat(item.cost_price);
      });

      const taxBreakdown = this.calculateGST(
        subtotal,
        billingAddress?.state_province || '',
        shippingAddress?.state_province || ''
      );

      const grandTotal = subtotal + taxBreakdown.taxAmount + parseFloat(order.shipping_amount);

      // Create invoice
      const newInvoice: NewInvoice = {
        id: crypto.randomUUID(),
        order_id: orderId,
        invoice_number: invoiceNumber,
        latest_version: 1,
        status: 'generated',
        created_at: new Date(),
        updated_at: new Date(),
      };

      const [invoice] = await db.insert(invoices).values(newInvoice).returning();

      // Create invoice version
      const newInvoiceVersion: NewInvoiceVersion = {
        id: crypto.randomUUID(),
        invoice_id: invoice.id,
        version_number: 1,
        customer_name: billingAddress?.recipient_name || shippingAddress?.recipient_name || 'Guest',
        customer_email: user?.email || '',
        customer_gstin: order.customer_gstin || null,
        billing_address: billingAddress
          ? `${billingAddress.address_line1}, ${billingAddress.address_line2 || ''}, ${billingAddress.city}, ${billingAddress.state_province} ${billingAddress.postal_code}`
          : '',
        shipping_address: shippingAddress
          ? `${shippingAddress.address_line1}, ${shippingAddress.address_line2 || ''}, ${shippingAddress.city}, ${shippingAddress.state_province} ${shippingAddress.postal_code}`
          : '',
        place_of_supply: billingAddress?.state_province || '',
        subtotal: subtotal.toString(),
        discount: order.discount_amount,
        shipping: order.shipping_amount,
        tax_amount: taxBreakdown.taxAmount.toString(),
        grand_total: grandTotal.toString(),
        cgst: taxBreakdown.cgst.toString(),
        sgst: taxBreakdown.sgst.toString(),
        igst: taxBreakdown.igst.toString(),
        tax_type: taxBreakdown.igst > 0 ? 'igst' : 'cgst_sgst',
        reason: 'INITIAL',
        created_at: new Date(),
        updated_at: new Date(),
      };

      const [invoiceVersion] = await db
        .insert(invoiceVersions)
        .values(newInvoiceVersion)
        .returning();

      // Create invoice line items
      const invoiceLineItemsData: NewInvoiceLineItem[] = orderItemsResult.map(item => ({
        id: crypto.randomUUID(),
        invoice_version_id: invoiceVersion.id,
        product_name: item.product_name,
        sku: item.sku || '',
        hsn_code: item.hsn_code || '0000', // Use product HSN or default
        quantity: item.quantity,
        unit_price: item.cost_price,
        tax_rate: '18', // Default 18% GST
        cgst_amount: (taxBreakdown.cgst / orderItemsResult.length).toString(), // Approximate
        sgst_amount: (taxBreakdown.sgst / orderItemsResult.length).toString(), // Approximate
        igst_amount: (taxBreakdown.igst / orderItemsResult.length).toString(), // Approximate
        line_total: (item.quantity * parseFloat(item.cost_price)).toString(),
        created_at: new Date(),
        updated_at: new Date(),
      }));

      await db.insert(invoiceLineItems).values(invoiceLineItemsData);

      // Generate PDF
      const pdfBuffer: Buffer = await this.generatePDFContent(
        invoice,
        order,
        orderItemsResult,
        billingAddress,
        shippingAddress,
        user
      );

      // Upload to Supabase Storage
      const folderPath = `invoices/${order.user_id || 'anonymous'}/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}`;
      const fileName = `${invoiceNumber}.pdf`;

      const uploadResult = await uploadToStorage(
        pdfBuffer,
        fileName,
        'application/pdf',
        order.user_id || 'anonymous',
        { folder: folderPath }
      );

      // Update invoice version with PDF info
      await db
        .update(invoiceVersions)
        .set({
          pdf_url: uploadResult.url,
          pdf_path: uploadResult.key,
          pdf_generated_at: new Date(),
        })
        .where(eq(invoiceVersions.id, invoiceVersion.id));

      logger.info('Invoice generated successfully', {
        orderId,
        invoiceId: invoice.id,
        invoiceNumber,
        fileUrl: uploadResult.url,
      });

      return this.getLatestInvoiceForOrder(orderId);
    } catch (error) {
      logger.error('Error generating invoice', { orderId, error });
      throw error;
    }
  }

  /**
   * Get latest invoice for order
   */
  async getLatestInvoiceForOrder(orderId: string): Promise<any> {
    try {
      logger.info('Getting latest invoice for order', { orderId });

      // Get invoice
      const [invoice] = await db.select().from(invoices).where(eq(invoices.order_id, orderId));

      if (!invoice) {
        throw new HttpException(404, 'Invoice not found');
      }

      // Get latest version
      const [latestVersion] = await db
        .select()
        .from(invoiceVersions)
        .where(
          and(
            eq(invoiceVersions.invoice_id, invoice.id),
            eq(invoiceVersions.version_number, invoice.latest_version)
          )
        );

      // Get line items
      const lineItems = await db
        .select()
        .from(invoiceLineItems)
        .where(eq(invoiceLineItems.invoice_version_id, latestVersion.id));

      return {
        ...invoice,
        version: latestVersion,
        line_items: lineItems,
      };
    } catch (error) {
      logger.error('Error getting latest invoice for order', { orderId, error });
      throw error;
    }
  }

  /**
   * Get invoice by version ID
   */
  async getInvoiceByVersionId(versionId: string): Promise<any> {
    try {
      logger.info('Getting invoice by version ID', { versionId });

      const [version] = await db
        .select()
        .from(invoiceVersions)
        .where(eq(invoiceVersions.id, versionId));

      if (!version) {
        throw new HttpException(404, 'Invoice version not found');
      }

      const [invoice] = await db.select().from(invoices).where(eq(invoices.id, version.invoice_id));

      const lineItems = await db
        .select()
        .from(invoiceLineItems)
        .where(eq(invoiceLineItems.invoice_version_id, versionId));

      return {
        ...invoice,
        version,
        line_items: lineItems,
      };
    } catch (error) {
      logger.error('Error getting invoice by version ID', { versionId, error });
      throw error;
    }
  }

  /**
   * Download invoice PDF
   */
  async downloadInvoice(versionId: string): Promise<{ buffer: Buffer; filename: string }> {
    try {
      logger.info('Downloading invoice', { versionId });

      const [version] = await db
        .select()
        .from(invoiceVersions)
        .where(eq(invoiceVersions.id, versionId));

      if (!version || !version.pdf_url) {
        throw new HttpException(404, 'Invoice PDF not found');
      }

      // Extract filename from URL
      const filename = version.pdf_url.split('/').pop() || 'invoice.pdf';

      // For Supabase storage, we need to use the storage client directly to get the file
      // This is a placeholder - you need to implement the actual download from Supabase
      // For now, we'll generate a new PDF as a fallback
      const [invoice] = await db.select().from(invoices).where(eq(invoices.id, version.invoice_id));

      const [order] = await db.select().from(orders).where(eq(orders.id, invoice.order_id));

      const orderItemsResult = await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.order_id, invoice.order_id));

      // Get user and addresses for PDF generation
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, order.user_id || ''));

      let billingAddress = null;
      let shippingAddress = null;

      if (order.billing_address_id) {
        [billingAddress] = await db
          .select()
          .from(userAddresses)
          .where(eq(userAddresses.id, order.billing_address_id));
      }

      if (order.shipping_address_id) {
        [shippingAddress] = await db
          .select()
          .from(userAddresses)
          .where(eq(userAddresses.id, order.shipping_address_id));
      }

      const pdfBuffer = await this.generatePDFContent(
        invoice,
        order,
        orderItemsResult,
        billingAddress,
        shippingAddress,
        user
      );

      return {
        buffer: pdfBuffer,
        filename: filename,
      };
    } catch (error) {
      logger.error('Error downloading invoice', { versionId, error });
      throw error;
    }
  }

  /**
   * Get all invoices for order
   */
  async getInvoicesForOrder(orderId: string): Promise<any[]> {
    try {
      logger.info('Getting all invoices for order', { orderId });

      const [invoice] = await db.select().from(invoices).where(eq(invoices.order_id, orderId));

      if (!invoice) {
        return [];
      }

      const versions = await db
        .select()
        .from(invoiceVersions)
        .where(eq(invoiceVersions.invoice_id, invoice.id))
        .orderBy(sql`${invoiceVersions.version_number} ASC`);

      return versions.map(version => ({
        ...invoice,
        version,
      }));
    } catch (error) {
      logger.error('Error getting invoices for order', { orderId, error });
      throw error;
    }
  }

  /**
   * Update invoice status
   */
  async updateInvoiceStatus(
    invoiceId: string,
    status: 'draft' | 'generated' | 'sent' | 'cancelled'
  ): Promise<void> {
    try {
      logger.info('Updating invoice status', { invoiceId, status });

      await db
        .update(invoices)
        .set({
          status,
          updated_at: new Date(),
        })
        .where(eq(invoices.id, invoiceId));
    } catch (error) {
      logger.error('Error updating invoice status', { invoiceId, status, error });
      throw error;
    }
  }
}

export const invoiceService = new InvoiceService();
