import DB from './index.schema';

export const TAGS_TABLE = 'tags';

export const seed = async (dropFirst = false) => {

    try {
        if (dropFirst) {
            console.log('Dropping Tables');
            await DB.schema.dropTable(TAGS_TABLE);
            console.log('Dropped Tables');
        }
        console.log('Seeding Tables');
        await DB.schema.createTable(TAGS_TABLE, table => {
            table.increments('tag_id').primary();
            table.string('tag_name').notNullable();
            table.string('tag_type').notNullable();
            table.boolean('status').defaultTo(true).comment('Active flag');
            table.boolean('is_active').defaultTo(true);
            table.integer('created_by').notNullable();
            table.timestamp('created_at').defaultTo(DB.fn.now())
            table.timestamp('updated_at').defaultTo(DB.fn.now());
            table.integer('updated_by').nullable();
            table.boolean('is_deleted').defaultTo(false);
            table.integer('deleted_by').nullable();
            table.timestamp('deleted_at').nullable();
        });

        console.log('Finished Seeding Tables');
        await DB.raw(`
          CREATE TRIGGER update_timestamp
          BEFORE UPDATE
          ON ${TAGS_TABLE}
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
