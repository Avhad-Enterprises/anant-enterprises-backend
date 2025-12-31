import DB from './index.schema';

export const COMPANY_USER = 'company_user';

export const seed = async (dropFirst = false) => {
  try {
    if (dropFirst) {
      console.log('Dropping Tables');
      await DB.schema.dropTable(COMPANY_USER);
      console.log('Dropped Tables');
    }
    console.log('Seeding Tables');
    await DB.schema.createTable(COMPANY_USER, table => {
      table.bigIncrements('id').primary();
      table
        .bigInteger('company_id')
        .notNullable()
        .references('company_id')
        .inTable('companies')
        .onDelete('CASCADE');
      table
        .bigInteger('user_id')
        .notNullable()
        .references('user_id')
        .inTable('users')
        .onDelete('CASCADE');
      table.timestamp('created_at').defaultTo(DB.fn.now());
      table.timestamp('updated_at').defaultTo(DB.fn.now());
    });

    console.log('Finished Seeding Tables');
    console.log('Creating Triggers');
    await DB.raw(`
          CREATE TRIGGER update_timestamp
          BEFORE UPDATE
          ON ${COMPANY_USER}
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
