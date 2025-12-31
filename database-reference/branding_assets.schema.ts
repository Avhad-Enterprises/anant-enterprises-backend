import DB from './index.schema';

export const BRANDING_ASSETS = 'branding_assets';

export const seed = async (dropFirst = false) => {
  try {
    if (dropFirst) {
      console.log('Dropping Tables');
      await DB.schema.dropTable(BRANDING_ASSETS);
      console.log('Dropped Tables');
    }
    console.log('Seeding Tables');
    // await DB.raw("set search_path to public")
    await DB.schema.createTable(BRANDING_ASSETS, table => {
      table.increments('id').primary(); //ID
      table.text('navbar_logo').nullable();
      table.text('navbar_logo_mobile').nullable();
      table.text('footer_logo').nullable();
      table.text('favicon').nullable();
      table.boolean('is_active').defaultTo(0);
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
          ON ${BRANDING_ASSETS}
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
