import DB from './index.schema';

export const COLLECTION_PRODUCTS = 'collection_products';

export const seed = async (dropFirst = false) => {
  try {
    if (dropFirst) {
      console.log('Dropping Tables');
      await DB.schema.dropTable(COLLECTION_PRODUCTS);
      console.log('Dropped Tables');
    }
    console.log('Seeding Tables');
    await DB.schema.createTable(COLLECTION_PRODUCTS, table => {
      table
        .bigInteger('collection_id')
        .notNullable()
        .references('id')
        .inTable('collections')
        .onDelete('CASCADE')
        .comment('Collection reference');
      table
        .bigInteger('product_id')
        .notNullable()
        .references('id')
        .inTable('products')
        .onDelete('CASCADE')
        .comment('Product reference');
      table.integer('sort_order').defaultTo(0).comment('Order in manual collections');
      table.timestamp('added_at').defaultTo(DB.fn.now()).comment('When product was added');
      table.primary(['collection_id', 'product_id']);
      table.integer('created_by').notNullable();
      table.timestamp('created_at').defaultTo(DB.fn.now());
      table.timestamp('updated_at').defaultTo(DB.fn.now());
      table.integer('updated_by').nullable();
      table.boolean('is_deleted').defaultTo(true);
      table.integer('deleted_by').nullable();
      table.timestamp('deleted_at').nullable();
    });

    console.log('Finished Seeding Tables');
    console.log('Creating Triggers');
    await DB.raw(`
          CREATE TRIGGER update_timestamp
          BEFORE UPDATE
          ON ${COLLECTION_PRODUCTS}
          FOR EACH ROW
          EXECUTE PROCEDURE update_timestamp();
        `);
    console.log('Finished Creating Triggers');
  } catch (error) {
    console.log(error);
  }
};

//    exports.seed = seed;
//    const run = async () => {
//       //createProcedure();
//        seed();
//    };
//    run();
