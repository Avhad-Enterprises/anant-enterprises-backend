import { db } from './src/db';
import { orders, orderItems, invoices, invoiceVersions, invoiceLineItems } from './src/db/schema';
import { eq, desc } from 'drizzle-orm';

async function debugInvoiceData() {
  const targetOrderNumber = 'ORD-ML2AL9CL-H2UO';

  console.log(`\n🔍 Debugging Invoice Data for Order: ${targetOrderNumber}`);

  // 1. Fetch Order
  const allOrders = await db.select().from(orders);
  const order = allOrders.find(o => o.order_number === targetOrderNumber);

  if (!order) {
    console.error('❌ Order not found!');
    process.exit(1);
  }
  console.log(`✅ Found Order ID: ${order.id}`);

  // 2. Fetch Order Items
  const items = await db.select().from(orderItems).where(eq(orderItems.order_id, order.id));
  console.log(`\n📦 Order Items (${items.length}):`);
  items.forEach(item => {
    console.log(`   - ${item.product_name} (Qty: ${item.quantity})`);
  });

  // 3. Fetch Invoice
  const orderInvoices = await db.select().from(invoices).where(eq(invoices.order_id, order.id));
  if (orderInvoices.length === 0) {
    console.log('❌ No invoice found for this order.');
    process.exit(0);
  }
  const invoice = orderInvoices[0];
  console.log(`\n📄 Invoice ID: ${invoice.id}`);

  // 4. Fetch Versions
  const versions = await db
    .select()
    .from(invoiceVersions)
    .where(eq(invoiceVersions.invoice_id, invoice.id))
    .orderBy(desc(invoiceVersions.version_number));

  console.log(`\n📚 Invoice Versions (${versions.length}):`);

  for (const v of versions) {
    console.log(`   [v${v.version_number}] Created: ${v.created_at}`);

    // 5. Fetch Line Items for this Version
    const lines = await db
      .select()
      .from(invoiceLineItems)
      .where(eq(invoiceLineItems.invoice_version_id, v.id));

    console.log(`      Line Items (${lines.length}):`);
    lines.forEach(l => {
      console.log(`      - ${l.description} (Qty: ${l.quantity})`);
    });
    console.log('');
  }

  process.exit(0);
}

debugInvoiceData().catch(console.error);
