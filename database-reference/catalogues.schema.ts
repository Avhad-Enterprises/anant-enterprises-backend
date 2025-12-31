import DB from './index.schema';

export const CATALOGUES = 'catalogues';

export const seed = async (dropFirst = false) => {
  try {
    if (dropFirst) {
      console.log('Dropping Tables');
      await DB.schema.dropTable(CATALOGUES);
      console.log('Dropped Tables');
    }
    console.log('Seeding Tables');
    // await DB.raw("set search_path to public")
    await DB.schema.createTable(CATALOGUES, table => {
      table.bigIncrements('catalogue_id').primary();
      table.string('name', 255).notNullable();
      table.enu('status', ['active', 'inactive']).defaultTo('active');
      table
        .enu('overall_adjustment_type', ['none', 'percentage', 'fixed_price', 'amount_off'])
        .defaultTo('percentage');
      table.decimal('overall_adjustment_value', 10, 2).defaultTo(0.0);
      table.date('valid_from').nullable();
      table.date('valid_to').nullable();
      table.integer('priority').defaultTo(1);
      table.jsonb('assigned_to').nullable();
      table.text('description').nullable();
      table.boolean('is_active').defaultTo(true);
      table.timestamp('created_at').defaultTo(DB.fn.now());
      table.timestamp('updated_at').defaultTo(DB.fn.now());
      table.boolean('is_deleted').defaultTo(false);
      table.bigInteger('created_by').nullable();
      table.bigInteger('updated_by').nullable();
      table.timestamp('deleted_at').nullable();
      table.bigInteger('deleted_by').nullable();
    });

    console.log('Finished Seeding Tables');
    console.log('Creating Triggers');
    await DB.raw(`
          CREATE TRIGGER update_timestamp
          BEFORE UPDATE
          ON ${CATALOGUES}
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
