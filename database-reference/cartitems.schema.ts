import DB from './index.schema';

export const CARTITEMS = 'cartitems';

export const seed = async (dropFirst = false) => {
  try {
    if (dropFirst) {
      console.log('Dropping Tables');
      await DB.schema.dropTable(CARTITEMS);
      console.log('Dropped Tables');
    }
    console.log('Seeding Tables');
    await DB.schema.createTable(CARTITEMS, table => {
      table.bigIncrements('cartitem_id').primary().comment('Primary key');

      table
        .bigInteger('cart_id')
        .notNullable()
        .references('cart_id')
        .inTable('cart')
        .onDelete('CASCADE')
        .comment('FK to cart');
      table
        .bigInteger('product_id')
        .nullable()
        .references('product_id')
        .inTable('products')
        .onDelete('SET NULL');
      table
        .bigInteger('bundle_id')
        .nullable()
        .references('id')
        .inTable('bundle_items')
        .onDelete('SET NULL');
      table.integer('quantity').notNullable().defaultTo(1).comment('Quantity selected');
      table.decimal('cost_price', 12, 2).notNullable().comment('Original price');
      table.decimal('final_price', 12, 2).notNullable().comment('Price after discount');

      table.decimal('line_subtotal', 12, 2).notNullable().comment('quantity × unit');
      table.decimal('line_total', 12, 2).notNullable().comment('Final line amount');
      table.timestamp('created_at').defaultTo(DB.fn.now());
      table.timestamp('updated_at').defaultTo(DB.fn.now());
      table.boolean('is_deleted').defaultTo(false);
      table.timestamp('deleted_at').nullable();
      table.bigInteger('created_by').nullable();
      table.bigInteger('updated_by').nullable();
      table.bigInteger('deleted_by').nullable();
    });

    console.log('Finished Seeding Tables');
    console.log('Creating Triggers');
    await DB.raw(`
          CREATE TRIGGER update_timestamp
          BEFORE UPDATE
          ON ${CARTITEMS}
          FOR EACH ROW
          EXECUTE PROCEDURE update_timestamp();
        `);
    console.log('Finished Creating Triggers');
  } catch (error) {
    console.log(error);
  }
};

// exports.seed = seed;
// const run = async () => {
//     //createProcedure();
//     seed();
// };
// run();
