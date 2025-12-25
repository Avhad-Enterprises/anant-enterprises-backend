import DB from './index.schema';

export const ADDRESS = 'address';

export const seed = async (dropFirst = false) => {

    try {
        if (dropFirst) {
            console.log('Dropping Tables');
            await DB.schema.dropTable(ADDRESS);
            console.log('Dropped Tables');
        }
        console.log('Seeding Tables');
        // await DB.raw("set search_path to public")
        await DB.schema.createTable(ADDRESS, table => {
            table.increments('address_id').primary(); // ID
            table.integer('user_id').unsigned().notNullable().references('user_id').inTable('users').onDelete('CASCADE').onUpdate('CASCADE');
            table.string('address_one').nullable();
            table.string('address_two').nullable();
            table.string('landmark').nullable();
            table.string('country').nullable();
            table.string('state').nullable();
            table.string('city').nullable();
            table.string('pincode').nullable();
            table.string('save_address_type').nullable();
            table.boolean('is_active').defaultTo(true); 
            table.boolean('is_delete').defaultTo(false);
            table.timestamp('created_at').defaultTo(DB.fn.now());
            table.timestamp('updated_at').defaultTo(DB.fn.now());
            table.timestamp('updated_by').nullable();
        });


        console.log('Finished Seeding Tables');
        console.log('Creating Triggers');
        await DB.raw(`
          CREATE TRIGGER update_timestamp
          BEFORE UPDATE
          ON ${ADDRESS}
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
//     //createProcedure();
//      seed();
//  };
//  run();

