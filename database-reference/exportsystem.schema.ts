import DB from './index.schema';

export const EXPORT_SYSTEM = 'export_system';

export const seed = async (dropFirst = false) => {

    try {
        if (dropFirst) {
            console.log('Dropping Tables');
            await DB.schema.dropTable(EXPORT_SYSTEM);
            console.log('Dropped Tables');
        }
        console.log('Seeding Tables');
        await DB.schema.createTable(EXPORT_SYSTEM, table => {
            table.bigIncrements('export_id').primary();
            table.string('module').notNullable();

            table.jsonb('fields')
                .notNullable()
                .defaultTo('[]')
                .comment('Fields user selected for export');

            table.jsonb('filters')
                .notNullable()
                .defaultTo('[]')
                .comment('Filters applied from UI');

            table.string('format')
                .notNullable()
                .defaultTo('csv')
                .comment('Export format: csv/xlsx');

            table.text('file_url')
                .nullable()
                .comment('Download URL or local file path');

            table.string('file_name')
                .nullable()
                .comment('Generated file name only');

            table.integer('row_count')
                .nullable()
                .comment('Total rows exported');
            table.timestamp('created_at').defaultTo(DB.fn.now());
            table.timestamp('updated_at').defaultTo(DB.fn.now());
        });

        console.log('Finished Seeding Tables');
        await DB.raw(`
          CREATE TRIGGER update_timestamp
          BEFORE UPDATE
          ON ${EXPORT_SYSTEM}
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
//      //createProcedure();
//      seed();
//  };
//  run();
