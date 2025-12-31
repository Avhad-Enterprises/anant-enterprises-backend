import DB from './index.schema';

export const Bundle_items = 'bundle_items';

export const seed = async (dropFirst = false) => {
  try {
    if (dropFirst) {
      console.log('Dropping Tables');
      await DB.schema.dropTable(Bundle_items);
      console.log('Dropped Tables');
    }
    console.log('Seeding Tables');
    // await DB.raw("set search_path to public")
    await DB.schema.createTable('bundle_items', table => {
      table.increments('id').primary(); // Unique ID for bundle item

      table
        .bigInteger('product_bundle_id')
        .unsigned()
        .references('id')
        .inTable('product_bundles')
        .onDelete('CASCADE')
        .onUpdate('CASCADE');

      table
        .bigInteger('product_id')
        .unsigned()
        .references('id')
        .inTable('products') // make sure this matches your actual product table
        .onDelete('CASCADE')
        .onUpdate('CASCADE');

      table.integer('quantity').defaultTo(1);
      table.boolean('is_optional').defaultTo(false);
      table.integer('min_select').defaultTo(0);
      table.integer('max_select').defaultTo(0);
      table.integer('sort_order').defaultTo(0);
      table.decimal('stock').nullable();
      table.boolean('is_active').defaultTo(true);

      // Audit columns
      table.integer('created_by').notNullable();
      table.timestamp('created_at').defaultTo(DB.fn.now());
      table.timestamp('updated_at').defaultTo(DB.fn.now());
      table.integer('updated_by').nullable();

      // Soft delete columns
      table.boolean('is_deleted').defaultTo(false);
      table.integer('deleted_by').nullable();
      table.timestamp('deleted_at').nullable();
    });

    console.log('Finished Seeding Tables');
    console.log('Creating Triggers');
    await DB.raw(`
          CREATE TRIGGER update_timestamp
          BEFORE UPDATE
          ON ${Bundle_items}
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
//    //createProcedure();
//     seed();
// };
// run();
