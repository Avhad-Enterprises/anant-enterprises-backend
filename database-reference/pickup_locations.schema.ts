import DB from './index.schema';

export const PICKUP_LOCATIONS = 'pickup_locations';

export const seed = async (dropFirst = false) => {
    try {
        if (dropFirst) {
            console.log('Dropping Tables');
            await DB.schema.dropTable(PICKUP_LOCATIONS);
            console.log('Dropped Tables');
        }
        await DB.schema.createTable(PICKUP_LOCATIONS, table => {
            table.bigIncrements('pickup_location_id').primary().comment('Primary key');

            table.string('name', 150).notNullable().comment('e.g., "Mumbai WH-1"');
            table.string('address_line1', 255).notNullable();
            table.string('address_line2', 255).nullable();

            table.string('city', 120).notNullable();
            table.string('state', 120).notNullable();
            table.string('country', 2).notNullable().comment('ISO 2-letter country code');
            table.string('pincode', 20).notNullable();

            table.string('contact_name', 120).nullable();
            table.string('phone', 25).nullable();

            table.decimal('latitude', 10, 7).nullable();
            table.decimal('longitude', 10, 7).nullable();

            table.boolean('is_default').defaultTo(false).comment('1 = default pickup location');
            table.boolean('status').defaultTo(true).comment('1 = active, 0 = inactive');

            table.bigInteger('created_by').nullable();
            table.bigInteger('updated_by').nullable();
            table.timestamp('created_at').defaultTo(DB.fn.now());
            table.timestamp('updated_at').defaultTo(DB.fn.now());

           table.boolean('is_deleted').defaultTo(false);
            table.timestamp('deleted_at').nullable();
            table.bigInteger('deleted_by').unsigned().nullable();
        });

        console.log('Finished Seeding Tables');
        console.log('Creating Triggers');
        await DB.raw(`
          CREATE TRIGGER update_timestamp
          BEFORE UPDATE
          ON ${PICKUP_LOCATIONS}
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

