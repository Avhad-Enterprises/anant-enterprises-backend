import DB from './index.schema';

export const INVENTORY_TRANSFERS = 'inventory_transfers';

export const seed = async (dropFirst = false) => {
  try {
    if (dropFirst) {
      console.log('Dropping Tables');
      await DB.schema.dropTable(INVENTORY_TRANSFERS);
      console.log('Dropped Tables');
    }
    console.log('Seeding Tables');
    await DB.schema.createTable(INVENTORY_TRANSFERS, table => {
      table.increments('transfer_id').primary();
      table.integer('from_location_id', 100).notNullable();
      table.integer('to_location_id').nullable();
      table.integer('product_id').nullable();
      table.integer('quantity').nullable();
      table.string('transfer_status').nullable();
      table.integer('initiated_by').nullable();
      table.integer('approved_by').nullable();
      table.timestamp('initiated_at').defaultTo(DB.fn.now());
      table.timestamp('completed_at').defaultTo(DB.fn.now());
      table.text('notes').nullable();
    });

    console.log('Finished Seeding Tables');
    console.log('Creating Triggers');
    await DB.raw(`
          CREATE TRIGGER update_timestamp
          BEFORE UPDATE
          ON ${INVENTORY_TRANSFERS}
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
