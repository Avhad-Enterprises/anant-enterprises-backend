import DB from './index.schema';

export const WISHLIST_TABLE = 'wishlist';

export const seed = async (dropFirst = false) => {

    try {
        if (dropFirst) {
            console.log('Dropping Tables');
            await DB.schema.dropTable(WISHLIST_TABLE);
            console.log('Dropped Tables');
        }
        await DB.schema.createTable(WISHLIST_TABLE, (table) => {
            table.bigIncrements('wishlist_id').primary().comment('Wishlist ID');

            table.bigInteger('user_id')
                .notNullable()
                .references('id')
                .inTable('users')
                .onDelete('CASCADE')
                .comment('Owner of the wishlist');

            table.jsonb('wishlist_items')
                .notNullable()
                .defaultTo('[]')
                .comment('Array of product IDs');

            table.timestamp('created_at').defaultTo(DB.fn.now()).comment('Creation timestamp');
            table.timestamp('updated_at').defaultTo(DB.fn.now()).comment('Last update timestamp');
            table.bigInteger('created_by').nullable();
            table.bigInteger('updated_by').nullable();
            table.boolean('is_deleted').defaultTo(false);
            table.timestamp('deleted_at').nullable();
            table.bigInteger('deleted_by').unsigned().nullable();

            table.index(['user_id'], 'idx_user_id');
        });


        console.log('Finished Seeding Tables');
        await DB.raw(`
          CREATE TRIGGER update_timestamp
          BEFORE UPDATE
          ON ${WISHLIST_TABLE}
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
