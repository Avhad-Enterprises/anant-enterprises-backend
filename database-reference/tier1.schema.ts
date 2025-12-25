import DB from './index.schema';

export const TIER_1 = 'tier_1';

export const seed = async (dropFirst = false) => {

    try {
        if (dropFirst) {
            console.log('Dropping Tables');
            await DB.schema.dropTable(TIER_1);
            console.log('Dropped Tables');
        }
        console.log('Seeding Tables');
        // await DB.raw("set search_path to public")
        await DB.schema.createTable(TIER_1, table => {
            table.increments("tier_1_id").primary();  //Id
            table.string("name").unique().notNullable();
            table.string("handle").unique().notNullable();
            table.integer('created_by').notNullable();
            table.timestamp('created_at').defaultTo(DB.fn.now());
            table.timestamp('updated_at').defaultTo(DB.fn.now());
            table.integer('updated_by').nullable();
            table.boolean("is_deleted").defaultTo(false);
            table.integer("deleted_by").nullable();
            table.timestamp("deleted_at").nullable();
            
          
        });
        console.log('Finished Seeding Tables');
        console.log('Creating Triggers');

        await DB.raw(`
          CREATE TRIGGER update_timestamp
          BEFORE UPDATE
          ON ${TIER_1}
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
    //    //createProcedure();
    //     seed();
    // };
    // run();
