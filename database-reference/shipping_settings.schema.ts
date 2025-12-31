import DB from './index.schema';

export const SHIPPING_SETTINGS = 'shipping_settings';

export const seed = async (dropFirst = false) => {
  try {
    if (dropFirst) {
      console.log('Dropping Tables');
      await DB.schema.dropTable(SHIPPING_SETTINGS);
      console.log('Dropped Tables');
    }
    console.log('Seeding Tables');

    await DB.schema.createTable(SHIPPING_SETTINGS, table => {
      table.increments('id').primary();
      table.string('default_shipping_method').nullable();
      table.decimal('free_shipping_min_amount').nullable();
      table.timestamp('created_at').defaultTo(DB.fn.now());
      table.timestamp('updated_at').defaultTo(DB.fn.now());
    });

    console.log('Finished Seeding Tables');
    console.log('Creating Triggers');

    await DB.raw(`
          CREATE OR REPLACE FUNCTION update_timestamp()
          RETURNS TRIGGER AS $$
          BEGIN
              NEW.updated_at = CURRENT_TIMESTAMP;
              RETURN NEW;
          END;
          $$ LANGUAGE plpgsql;
        `);

    await DB.raw(`
          DROP TRIGGER IF EXISTS update_timestamp ON ${SHIPPING_SETTINGS};
          CREATE TRIGGER update_timestamp
          BEFORE UPDATE
          ON ${SHIPPING_SETTINGS}
          FOR EACH ROW
          EXECUTE FUNCTION update_timestamp();
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
