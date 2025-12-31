import DB from './index.schema';

export const SIZES_TABLE = 'sizes';

export const seed = async (dropFirst = false) => {
  try {
    if (dropFirst) {
      console.log('Dropping Tables');
      await DB.schema.dropTable(SIZES_TABLE);
      console.log('Dropped Tables');
    }
    console.log('Seeding Tables');
    await DB.schema.createTable(SIZES_TABLE, table => {
      table.bigIncrements('size_id').primary();
      table.string('label', 80).unique().notNullable().comment('e.g., "24 MM", "26 MM"');
      table.integer('sort_order').defaultTo(0).comment('Display order');
      table.boolean('status').defaultTo(true).comment('Active flag');
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
    await DB.raw(`
          CREATE TRIGGER update_timestamp
          BEFORE UPDATE
          ON ${SIZES_TABLE}
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
//      //createProcedure();
//      seed();
//  };
//  run();
