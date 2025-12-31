import DB from './index.schema';

export const REPORT_TEMPLATES = 'report_templates';

export const seed = async (dropFirst = false) => {
  try {
    if (dropFirst) {
      console.log('Dropping Tables');
      await DB.schema.dropTable(REPORT_TEMPLATES);
      console.log('Dropped Tables');
    }
    console.log('Seeding Tables');
    // await DB.raw("set search_path to public")
    await DB.schema.createTable(REPORT_TEMPLATES, table => {
      table.increments('id').primary();
      table.string('report_module', 50).notNullable();
      table.string('template_name', 100).notNullable();
      table.string('title', 100).nullable();
      table.text('description').nullable();
      table.jsonb('filters').nullable();
      table.jsonb('metrics').nullable();
      table.enu('schedule_type', ['daily', 'weekly', 'monthly']).nullable();
      table.string('email').unique().nullable();
      table.enu('chart_type', ['bar', 'line', 'pie', 'table']).notNullable();
      table.string('visual_type', 30).nullable();
      table.integer('created_by').notNullable();
      table.boolean('is_active').defaultTo(true);
      table.timestamp('created_at').defaultTo(DB.fn.now());
      table.timestamp('updated_at').defaultTo(DB.fn.now());
      table.timestamp('deleted_at').defaultTo(DB.fn.now());
      table.integer('deleted_by').nullable();
      table.boolean('is_deleted').defaultTo(false);
    });

    console.log('Finished Seeding Tables');
    console.log('Creating Triggers');
    await DB.raw(`
          CREATE TRIGGER update_timestamp
          BEFORE UPDATE
          ON ${REPORT_TEMPLATES}
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
