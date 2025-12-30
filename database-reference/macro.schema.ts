import DB from './index.schema';

export const MACRO = 'macro';

export const seed = async (dropFirst = false) => {

    try {
        if (dropFirst) {
            console.log('Dropping Tables');
            await DB.schema.dropTable(MACRO);
            console.log('Dropped Tables');
        }
        console.log('Seeding Tables');
        await DB.schema.createTable(MACRO, (table) => {
            table.bigIncrements('macro_id')
                .primary()
                .comment('Primary key for macros');

            table.string('title', 255)
                .notNullable()
                .comment('Macro title');

            table.text('description')
                .nullable()
                .comment('Macro description (rich text or plain)');

            table.text('message')
                .notNullable()
                .comment('Actual message text for the macro');

            table.jsonb('variables')
                .notNullable()
                .defaultTo(DB.raw(`'[]'::jsonb`))
                .comment('List of variables like ["{{customer_name}}", "{{order_id}}"]');

            table.timestamp('created_at')
                .defaultTo(DB.fn.now())
                .comment('Creation timestamp');

            table.integer('created_by')
                .nullable()
                .comment('User who created the macro');

            table.timestamp('updated_at')
                .defaultTo(DB.fn.now())
                .comment('Last updated timestamp');

            table.integer('updated_by')
                .nullable()
                .comment('User who last updated the macro');

            table.boolean('is_deleted')
                .defaultTo(false)
                .comment('Soft delete flag');

            table.integer('deleted_by')
                .nullable()
                .comment('User who deleted the macro');

            table.timestamp('deleted_at')
                .nullable()
                .comment('Soft delete timestamp');
        });



        console.log('Finished Seeding Tables');
        console.log('Creating Triggers');
        await DB.raw(`
          CREATE TRIGGER update_timestamp
          BEFORE UPDATE
          ON ${MACRO}
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


