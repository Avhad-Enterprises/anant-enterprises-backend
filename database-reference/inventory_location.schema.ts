
import DB from './index.schema';

export const INVENTORY_LOCATIONS = 'inventory_locations';

export const seed = async (dropFirst = false) => {

    try {
        if (dropFirst) {
            console.log('Dropping Tables');
            await DB.schema.dropTable(INVENTORY_LOCATIONS);
            console.log('Dropped Tables');
        }
        console.log('Seeding Tables');
        await DB.schema.createTable(INVENTORY_LOCATIONS, table => {
            table.increments('id').primary(); // ID
            table.string('location_name', 100).notNullable();
            table.text('address_line1').nullable();
            table.text('address_line2').nullable();
            table.string('city').nullable();
            table.string('state').nullable();
            table.string('country').nullable();
            table.string('pincode').nullable();
            table.string('phone_number').nullable();
            table.string('email').nullable();
            table.boolean('is_primary').defaultTo(false);
            table.boolean('status').defaultTo(true);
            table.timestamp('created_at').defaultTo(DB.fn.now());
            table.timestamp('updated_at').defaultTo(DB.fn.now());
        });

        console.log('Finished Seeding Tables');
        console.log('Creating Triggers');
        await DB.raw(`
          CREATE TRIGGER update_timestamp
          BEFORE UPDATE
          ON ${INVENTORY_LOCATIONS}
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


