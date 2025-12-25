import DB from './index.schema';

export const CUSTOMIZATION_GROUP_OPTIONS = 'customization_group_options';

export const seed = async (dropFirst = false) => {
    try {
        if (dropFirst) {
            console.log('Dropping Tables');
            await DB.schema.dropTable(CUSTOMIZATION_GROUP_OPTIONS);
            console.log('Dropped Tables');
        }
        console.log('Seeding Tables');
        await DB.schema.createTable(CUSTOMIZATION_GROUP_OPTIONS, (table) => {
            table.bigIncrements('id')
                .primary()
                .comment('Unique ID');
            table.bigInteger('group_id')
                .notNullable()
                .references('group_id')
                .inTable('customization_groups')
                .onDelete('CASCADE')
                .comment('Linked customization group');
            table.bigInteger('option_id')
                .notNullable()
                .references('option_id')
                .inTable('customization_options')
                .onDelete('CASCADE')
                .comment('Linked customization option');
            table.timestamp('created_at').defaultTo(DB.fn.now());
            table.timestamp('updated_at').defaultTo(DB.fn.now());
        });

        console.log('Finished Seeding Tables');
        console.log('Creating Triggers');
        await DB.raw(`
          CREATE TRIGGER update_timestamp
          BEFORE UPDATE
          ON ${CUSTOMIZATION_GROUP_OPTIONS}
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
