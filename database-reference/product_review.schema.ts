import DB from './index.schema';

export const PRODUCT_REVIEWS = 'product_reviews';

export const seed = async (dropFirst = false) => {
    try {
        if (dropFirst) {
            console.log('Dropping Tables');
            await DB.schema.dropTable(PRODUCT_REVIEWS);
            console.log('Dropped Tables');
        }
        console.log('Seeding Tables');
        await DB.schema.createTable(PRODUCT_REVIEWS, (table) => {
            table.bigIncrements('productreview_id').primary().comment('Review ID');
            table.bigInteger('product_id').unsigned().notNullable()
                .references('product_id')
                .inTable('products')
                .onDelete('CASCADE')
                .comment('Reviewed product');
            table.bigInteger('user_id').unsigned().nullable()
                .references('user_id')
                .inTable('users')
                .onDelete('SET NULL')
                .comment('Reviewer (NULL if guest)');

            table.integer('rating').notNullable().comment('1–5 rating');
            table.string('title', 180).nullable().comment('Optional review title');
            table.text('body').notNullable().comment('Review text');
            table.jsonb('images_json').nullable().comment('Array of image URLs');
            table.enu('status', ['pending', 'approved', 'rejected'],).notNullable().defaultTo('pending').comment('Moderation state');

            table.string('moderation_reason', 255).nullable().comment('Reason for reject/edit');
            table.bigInteger('moderated_by').unsigned().nullable()
                .references('user_id')
                .inTable('users')
                .onDelete('SET NULL')
                .comment('Admin user who moderated');

            table.dateTime('moderated_at').nullable().comment('Timestamp of decision');
            table.boolean('is_deleted').defaultTo(false);
            table.bigInteger('deleted_by').unsigned().nullable()
                .references('user_id')
                .inTable('users')
                .onDelete('SET NULL');
            table.timestamp('deleted_at').nullable();

            table.bigInteger('created_by').unsigned().nullable();
            table.bigInteger('updated_by').unsigned().nullable();
            table.timestamp('created_at').defaultTo(DB.fn.now());
            table.timestamp('updated_at').defaultTo(DB.fn.now());
        });

        console.log('Finished Seeding Tables');
        console.log('Creating Triggers');
        await DB.raw(`
          CREATE TRIGGER update_timestamp
          BEFORE UPDATE
          ON ${PRODUCT_REVIEWS}
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


