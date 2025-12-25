import DB from './index.schema';

export const PINCODE_MAPPING = 'pincode_mapping';

export const seed = async (dropFirst = false) => {
    try {
        if (dropFirst) {
            console.log('Dropping Tables');
            await DB.schema.dropTable(PINCODE_MAPPING);
            console.log('Dropped Tables');
        }
        await DB.schema.createTable(PINCODE_MAPPING, table => {
            table.bigIncrements('pincode_id').primary().comment('Primary key');
            table.string('delivery_partner', 300).notNullable().comment('Delivery partner name e.g., bluedart');
            table.integer('area_pincode').defaultTo(0).comment('Serviceable pincode');
            table.string('pickup', 255).defaultTo('Y').comment('Pickup available: Y/N');
            table.string('delivery', 255).defaultTo('Y').comment('Delivery available: Y/N');
            table.string('cod', 255).defaultTo('Y').comment('Cash on Delivery available: Y/N');
            table.decimal('cost', 10, 7).nullable().comment('Delivery cost');
            table.decimal('discount', 10, 7).nullable().comment('Discount offered');
            table.timestamp('created_at').defaultTo(DB.fn.now()).comment('Creation timestamp');
            table.timestamp('updated_at').defaultTo(DB.fn.now()).comment('Last update timestamp');
            table.bigInteger('created_by').nullable();
            table.bigInteger('updated_by').nullable();
            table.boolean('is_deleted').defaultTo(false);
            table.timestamp('deleted_at').nullable();
            table.bigInteger('deleted_by').unsigned().nullable();
        });

        console.log('Finished Seeding Tables');
        console.log('Creating Triggers');
        await DB.raw(`
          CREATE TRIGGER update_timestamp
          BEFORE UPDATE
          ON ${PINCODE_MAPPING}
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
