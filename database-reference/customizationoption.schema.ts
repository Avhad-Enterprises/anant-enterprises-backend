import DB from './index.schema';

export const CUSTOMIZATION_OPTIONS = 'customization_options';

export const seed = async (dropFirst = false) => {
  try {
    if (dropFirst) {
      console.log('Dropping Tables');
      await DB.schema.dropTable(CUSTOMIZATION_OPTIONS);
      console.log('Dropped Tables');
    }
    console.log('Seeding Tables');
    await DB.schema.createTable(CUSTOMIZATION_OPTIONS, table => {
      table.bigIncrements('option_id').primary().comment('Unique option ID');
      table
        .string('option_name')
        .notNullable()
        .comment('Option name (e.g., Small, Medium, Extra Cheese)');
      table.text('option_description').nullable().comment('Optional description for UI');
      table.decimal('price', 10, 2).defaultTo(0).comment('Extra price for this option');
      table
        .decimal('compare_price', 10, 2)
        .nullable()
        .comment('Old/original price to show discount');
      table.integer('sort_order').defaultTo(0).comment('Ordering inside group');
      table.enu('status', ['active', 'inactive']).defaultTo('active').comment('Visibility status');
      table.integer('created_by').notNullable().comment('Admin user who created');
      table.timestamp('created_at').defaultTo(DB.fn.now());
      table.integer('updated_by').nullable().comment('Admin user who updated');
      table.timestamp('updated_at').defaultTo(DB.fn.now());
      table.boolean('is_deleted').defaultTo(false).comment('Soft delete flag');
      table.integer('deleted_by').nullable().comment('Admin user who deleted');
      table.timestamp('deleted_at').nullable().comment('Deletion timestamp');
    });

    console.log('Finished Seeding Tables');
    console.log('Creating Triggers');
    await DB.raw(`
          CREATE TRIGGER update_timestamp
          BEFORE UPDATE
          ON ${CUSTOMIZATION_OPTIONS}
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
