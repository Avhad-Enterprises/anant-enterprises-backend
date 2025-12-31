import DB from './index.schema';

export const ORDERS_ITEMS = 'orders_items';

export const seed = async (dropFirst = false) => {
  try {
    if (dropFirst) {
      console.log('Dropping Tables');
      await DB.schema.dropTableIfExists(ORDERS_ITEMS);
      console.log('Dropped Tables');
    }
    console.log('Seeding Tables');
    await DB.schema.createTable(ORDERS_ITEMS, table => {
      table.bigIncrements('orderitem_id').primary();
      table
        .bigInteger('order_id')
        .unsigned()
        .notNullable()
        .references('order_id')
        .inTable('orders')
        .onDelete('CASCADE');
      table
        .bigInteger('product_id')
        .unsigned()
        .nullable()
        .references('product_id')
        .inTable('products')
        .onDelete('SET NULL');
      table.string('sku', 100).nullable();
      table.string('product_name', 255).notNullable();
      table.string('product_image', 500).nullable();
      table.decimal('cost_price', 12, 2).notNullable().defaultTo(0.0);
    });
    console.log('Finished Seeding Tables');

    console.log('Creating Triggers');
    await DB.raw(`
      CREATE TRIGGER update_timestamp
      BEFORE UPDATE
      ON ${ORDERS_ITEMS}
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
