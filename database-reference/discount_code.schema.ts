import DB from './index.schema';

export const DISCOUNT_CODE = 'discount_code';

export const seed = async (dropFirst = false) => {
  try {
    if (dropFirst) {
      console.log('Dropping Tables');
      await DB.schema.dropTable(DISCOUNT_CODE);
      console.log('Dropped Tables');
    }
    console.log('Seeding Tables');
    await DB.schema.createTable(DISCOUNT_CODE, table => {
      table.bigIncrements('discountcode_id').primary().comment('Code row ID');

      table
        .bigInteger('discount_id')
        .notNullable()
        .references('discount_id')
        .inTable('discounts')
        .onDelete('CASCADE')
        .comment('Parent discount campaign');

      table.string('code', 64).notNullable().unique().comment('e.g., SUMMER10, A1B2C3D4');

      table
        .integer('usage_count')
        .defaultTo(0)
        .comment('Number of times this code has been redeemed');
      table.bigInteger('created_by').unsigned().nullable().comment('Admin who created');
      table.bigInteger('updated_by').unsigned().nullable().comment('Last updated by');
      table.timestamp('created_at').defaultTo(DB.fn.now()).comment('Creation timestamp');
      table.timestamp('updated_at').defaultTo(DB.fn.now()).comment('Last update timestamp');
      table.boolean('is_deleted').defaultTo(false).comment('Soft delete flag');
      table.timestamp('deleted_at').nullable().comment('Soft delete time');
      table.bigInteger('deleted_by').unsigned().nullable().comment('Deleted by admin id');
    });

    console.log('Finished Seeding Tables');
    console.log('Creating Triggers');
    await DB.raw(`
          CREATE TRIGGER update_timestamp
          BEFORE UPDATE
          ON ${DISCOUNT_CODE}
          FOR EACH ROW
          EXECUTE PROCEDURE update_timestamp();
        `);
    console.log('Finished Creating Triggers');
  } catch (error) {
    console.log(error);
  }
};

//   exports.seed = seed;
//   const run = async () => {
//      //createProcedure();
//       seed();
//   };
//   run();
