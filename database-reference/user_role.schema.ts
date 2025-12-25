import DB from './index.schema';

export const USER_ROLES = 'user_roles';

export const seed = async (dropFirst = false) => {
    try {
        if (dropFirst) {
            console.log('Dropping Tables');
            await DB.schema.dropTable(USER_ROLES);
            console.log('Dropped Tables');
        }

        console.log('Seeding Tables');

        await DB.schema.createTable(USER_ROLES, table => {
            table.increments('id').primary();

            table
                .integer('user_id')
                .notNullable()
                .references('user_id')
                .inTable('users')
                .onDelete('CASCADE');

            table
                .integer('role_id')
                .notNullable()
                .references('role_id')
                .inTable('role')
                .onDelete('CASCADE');
        });

        console.log('Finished Seeding Tables');

        await DB.raw(`
      CREATE TRIGGER update_timestamp
      BEFORE UPDATE
      ON ${USER_ROLES}
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
//     //createProcedure();
//      seed();
//     };
//     run();

