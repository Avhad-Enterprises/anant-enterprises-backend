import DB from './index.schema';

export const TIER_2 = 'tier_2';

export const seed = async (dropFirst = false) => {

    try {
        if (dropFirst) {
            console.log('Dropping Tables');
            await DB.schema.dropTable(TIER_2);
            console.log('Dropped Tables');
        }
        console.log('Seeding Tables');
        // await DB.raw("set search_path to public")
        await DB.schema.createTable(TIER_2, table => {
            table.increments("tier_2_id").primary();  //Id
            table
            .bigInteger("tier_1_id")
            .unsigned()
            .references("id")
            .inTable("TIER_1")
            .onDelete("CASCADE")
            .onUpdate("CASCADE");
            table.string("name").unique().notNullable();
            table.string("handle").unique().notNullable();
            table.tinyint("status").defaultTo(1);
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
          ON ${TIER_2}
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
