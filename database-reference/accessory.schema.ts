import DB from './index.schema';

export const ACCESSORIES_TABLE = 'accessories';

export const seed = async (dropFirst = false) => {
  try {
    if (dropFirst) {
      console.log('Dropping Tables');
      await DB.schema.dropTable(ACCESSORIES_TABLE);
      console.log('Dropped Tables');
    }
    console.log('Seeding Tables');

    await DB.schema.createTable(ACCESSORIES_TABLE, table => {
      table.bigIncrements('accessory_id').primary().comment('Accessory ID');
      table
        .string('name', 150)
        .notNullable()
        .unique()
        .comment('Accessory name, e.g., "Carrom Stand"');
      table.boolean('status').defaultTo(true);
      table.integer('created_by').notNullable();
      table.timestamp('created_at').defaultTo(DB.fn.now()).comment('Record creation timestamp');
      table.timestamp('updated_at').defaultTo(DB.fn.now()).comment('Record update timestamp');
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
          ON ${ACCESSORIES_TABLE}
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
