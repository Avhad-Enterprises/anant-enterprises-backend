import DB from './index.schema';

export const COMPANY = 'company';

export const seed = async (dropFirst = false) => {
  try {
    if (dropFirst) {
      console.log('Dropping Tables');
      await DB.schema.dropTable(COMPANY);
      console.log('Dropped Tables');
    }
    console.log('Seeding Tables');
    await DB.schema.createTable(COMPANY, table => {
      table.bigIncrements('company_id').primary();
      table.string('name', 255).notNullable();
      table.string('email', 255).notNullable();
      table.string('phone', 50).notNullable();
      table.string('gst_number', 50);
      table.string('pan_number', 50);
      table.text('address');
      table.string('company_type', 50);
      table.enu('user_assignment_type', ['manual', 'automated']).defaultTo('manual').nullable();
      table.enu('match_type', ['all', 'any']).defaultTo(null);
      table.jsonb('automated_rules');
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
          ON ${COMPANY}
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
