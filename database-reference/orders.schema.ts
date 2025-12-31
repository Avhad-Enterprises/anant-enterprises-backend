import DB from './index.schema';

export const ORDERS = 'orders';

export const seed = async (dropFirst = false) => {
  try {
    if (dropFirst) {
      console.log('Dropping Tables');
      await DB.schema.dropTableIfExists(ORDERS);
      console.log('Dropped Tables');
    }

    console.log('Seeding Tables');

    await DB.schema.createTable(ORDERS, table => {
      table.bigIncrements('order_id').primary().comment('Primary key');

      table
        .string('order_number', 40)
        .unique()
        .notNullable()
        .comment('Human-friendly code (e.g., #123456)');

      table
        .bigInteger('user_id')
        .unsigned()
        .nullable()
        .references('user_id')
        .inTable('users')
        .onDelete('SET NULL')
        .comment('FK to users (nullable for guest checkout)');

      table
        .enu('channel', ['web', 'app', 'pos', 'marketplace', 'other'])
        .defaultTo('web')
        .comment('Order source');

      table.boolean('is_draft').defaultTo(false).comment('Draft/quote before payment');
      table.string('payment_method', 60).comment('e.g., card, upi, cod');
      table
        .enu('payment_status', [
          'pending',
          'authorized',
          'partially_paid',
          'paid',
          'refunded',
          'failed',
          'partially_refunded',
        ])
        .defaultTo('pending')
        .comment('Payment state');
      table.string('payment_ref', 120).nullable().comment('PSP payment intent/id');
      table.string('transaction_id', 120).nullable().comment('Charge/txn id');
      table.dateTime('paid_at').nullable().comment('When payment completed');
      table.string('currency', 3).defaultTo('INR').comment('ISO currency');

      table.decimal('subtotal', 12, 2).notNullable().defaultTo(0.0).comment('Sum of line totals');
      table
        .enu('discount_type', ['percent', 'amount', 'none'])
        .defaultTo('none')
        .comment('Cart-level discount type');
      table
        .decimal('discount_value', 12, 2)
        .notNullable()
        .defaultTo(0.0)
        .comment('% or amount value');
      table
        .decimal('discount_amount', 12, 2)
        .notNullable()
        .defaultTo(0.0)
        .comment('Final discounted amount');
      table.string('discount_code', 80).nullable();
      table.string('giftcard_code', 80).nullable();
      table.decimal('giftcard_amount', 12, 2).notNullable().defaultTo(0.0);

      table.string('shipping_method', 120).nullable();
      table.string('shipping_option', 120).nullable();
      table.decimal('shipping_amount', 12, 2).notNullable().defaultTo(0.0);
      table.decimal('partial_cod_charges', 12, 2).notNullable().defaultTo(0.0);
      table.decimal('advance_paid_amount', 12, 2).defaultTo(0.0);
      table.decimal('cod_due_amount', 12, 2).defaultTo(0.0);

      table.decimal('tax_amount', 12, 2).notNullable().defaultTo(0.0);
      table.decimal('cgst', 12, 2).notNullable().defaultTo(0.0);
      table.decimal('sgst', 12, 2).notNullable().defaultTo(0.0);
      table.decimal('igst', 12, 2).notNullable().defaultTo(0.0);
      table.decimal('total_amount', 12, 2).notNullable().defaultTo(0.0).comment('Grand total');
      table.integer('total_quantity').notNullable().defaultTo(0);

      table
        .enu('fulfillment_status', ['unfulfilled', 'partial', 'fulfilled', 'returned', 'cancelled'])
        .defaultTo('unfulfilled')
        .comment('Ship state');
      table.dateTime('fulfillment_date').nullable();
      table.dateTime('delivery_date').nullable();
      table.dateTime('return_date').nullable();
      table.string('order_tracking', 200).nullable();
      table.string('customer_gstin', 20).nullable();
      table.boolean('is_international_order').notNullable().defaultTo(false);

      table.json('tags').nullable();
      table.string('customer_note', 500).nullable();
      table.string('admin_comment', 500).nullable();
      table.string('amz_order_id', 100).nullable();

      table.timestamp('created_at').defaultTo(DB.fn.now());
      table.timestamp('updated_at').defaultTo(DB.fn.now());
      table.bigInteger('created_by').nullable();
      table.bigInteger('updated_by').nullable();
      table.boolean('is_deleted').defaultTo(false);
      table.timestamp('deleted_at').nullable();
      table.bigInteger('deleted_by').nullable();
    });

    console.log('Finished Seeding Tables');

    console.log('Creating Triggers');
    await DB.raw(`
      CREATE TRIGGER update_timestamp
      BEFORE UPDATE
      ON ${ORDERS}
      FOR EACH ROW
      EXECUTE PROCEDURE update_timestamp();
    `);
    console.log('Finished Creating Triggers');
  } catch (error) {
    console.log(error);
  }
};

//  exports.seed = seed;
//  const run = async () => {
//   //createProcedure();
//    seed();
//   };
//  run();
