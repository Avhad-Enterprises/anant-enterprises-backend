import DB from './index.schema';

export const BLOG = 'blogs';

export const seed = async (dropFirst = false) => {
    try {
        if (dropFirst) {
            console.log('Dropping Tables');
            await DB.schema.dropTable(BLOG);
            console.log('Dropped Tables');
        }
        console.log('Seeding Tables');
        await DB.schema.createTable(BLOG, table => {
            table.increments('blog_id').primary();
            table.integer('author_id')
                .unsigned()
                .nullable()
                .references('user_id')
                .inTable('users')
                .onDelete('SET NULL');
            table.string('author_name').notNullable();
            table.string('title').notNullable();
            table.string('slug').notNullable().unique();
            table.text('banner_image').nullable();
            table.text('content', 'longtext').nullable();
            table.text('short_description').nullable();
            table.string('category_id').nullable();
            table.enu('status', ['draft', 'published']).defaultTo('draft');
            table.boolean('is_featured').defaultTo(false);
            table.integer('views').defaultTo(0);
            table.string('seo_title').nullable();
            table.text('seo_description').nullable();
            table.integer('reading_time').defaultTo(0);
            table.integer('comment_count').defaultTo(0);
            table.bigInteger('subsection_id')
                .unsigned()
                .notNullable()
                .references('subsection_id')
                .inTable('blog_subsections')
                .onDelete('CASCADE')
                .comment('Blog subsection reference');
            table.text("tags", "jsonb").nullable();
            table.text("notes", "jsonb").nullable();
            table.boolean("is_active").defaultTo(true);
            table.integer('created_by').notNullable();
            table.timestamp('created_at').defaultTo(DB.fn.now());
            table.timestamp('updated_at').defaultTo(DB.fn.now());
            table.integer('updated_by').nullable();
            table.boolean('is_deleted').defaultTo(false);
            table.integer('deleted_by').nullable();
            table.timestamp('deleted_at').nullable();
        });
        console.log('Finished Seeding Tables');
        console.log('Creating Triggers');
        await DB.raw(`
          CREATE TRIGGER update_timestamp
          BEFORE UPDATE
          ON ${BLOG}
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
//        //createProcedure();
//        seed();
//    };
//    run();