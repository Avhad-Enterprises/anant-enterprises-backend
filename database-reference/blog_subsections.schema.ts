import DB from './index.schema';

export const BLOG_SUBSECTIONS = 'blog_subsections';

export const seed = async (dropFirst = false) => {
    try {
        if (dropFirst) {
            console.log('Dropping Tables');
            await DB.schema.dropTable(BLOG_SUBSECTIONS);
            console.log('Dropped Tables');
        }
        console.log('Seeding Tables');
        await DB.schema.createTable(BLOG_SUBSECTIONS, (table) => {
            table.bigIncrements('subsection_id').primary().comment('Primary Key');
            table.string('title', 255).notNullable().comment('Subsection title');
            table.string('slug', 255).unique().notNullable().comment('SEO-friendly URL');
            table.text('description').nullable().comment('Main description/content');
            table.string('image', 500).nullable().comment('Banner image URL');
            table.boolean('is_active').defaultTo(true).notNullable().comment('Soft status');
            table.timestamp('created_at').defaultTo(DB.fn.now()).notNullable();
            table.timestamp('updated_at').defaultTo(DB.fn.now()).notNullable();
            table.bigInteger('created_by').nullable();
            table.bigInteger('updated_by').nullable();
            table.timestamp('deleted_at').nullable();
        });

        console.log('Finished Seeding Tables');
        console.log('Creating Triggers');
        await DB.raw(`
          CREATE TRIGGER update_timestamp
          BEFORE UPDATE
          ON ${BLOG_SUBSECTIONS}
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