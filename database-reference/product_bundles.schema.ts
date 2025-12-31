import DB from './index.schema';

export const PRODUCT_BUNDLES = 'product_bundles';

export const seed = async (dropFirst = false) => {
  try {
    if (dropFirst) {
      console.log('Dropping Tables');
      await DB.schema.dropTable(PRODUCT_BUNDLES);
      console.log('Dropped Tables');
    }
    console.log('Seeding Tables');
    await DB.schema.createTable('product_bundles', table => {
      table.increments('product_bundle_id').primary();
      table.string('bundle_title').notNullable();
      table.text('bundle_description').nullable();
      table
        .enu('bundle_type', ['draft', 'active', 'inactive', 'archived'])
        .defaultTo('draft')
        .comment('Product state');
      table.decimal('fixed_price').nullable();
      table.decimal('percentage_discount').nullable();
      table.boolean('status').defaultTo(true);
      table.string('bundle_image').nullable();
      table.timestamp('starts_at').nullable();
      table.timestamp('ends_at').nullable();
      table.boolean('is_active').defaultTo(true);
      table.integer('created_by').notNullable();
      table.timestamp('created_at').defaultTo(DB.fn.now());
      table.timestamp('updated_at').defaultTo(DB.fn.now());
      table.integer('updated_by').nullable();
      table.boolean('is_deleted').defaultTo(false);
      table.integer('deleted_by').nullable();
      table.timestamp('deleted_at').nullable();
    });

    console.log('Finished Seeding Tables');
    console.log('Creating Triggers');
    await DB.raw(`
          CREATE TRIGGER update_timestamp
          BEFORE UPDATE
          ON ${PRODUCT_BUNDLES}
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
