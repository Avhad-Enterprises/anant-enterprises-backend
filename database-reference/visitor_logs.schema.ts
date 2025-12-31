import DB from './index.schema';

export const VISITOR_LOGS = 'visitor_logs';

export const seed = async (dropFirst = false) => {
  try {
    if (dropFirst) {
      console.log('Dropping Tables');
      await DB.schema.dropTable(VISITOR_LOGS);
      console.log('Dropped Tables');
    }
    console.log('Seeding Tables');
    // await DB.raw("set search_path to public")
    await DB.schema.createTable(VISITOR_LOGS, table => {
      table.bigIncrements('log_id').primary();

      table.string('session_id').notNullable();
      table
        .foreign('session_id')
        .references('session_id')
        .inTable('visitor_sessions')
        .onDelete('CASCADE');

      table.bigInteger('user_id').unsigned().nullable();
      table.foreign('user_id').references('id').inTable('users').onDelete('SET NULL');

      table.string('event_type').notNullable();
      table.jsonb('event_data').nullable();
      table.string('page_url').notNullable();
      table.string('referrer_url').nullable();
      table.timestamp('timestamp').defaultTo(DB.fn.now());

      table.bigInteger('device_id').unsigned().nullable();
      table.foreign('device_id').references('id').inTable('visitor_devices').onDelete('SET NULL');

      table.string('ip_address').nullable();
      table.text('user_agent').nullable();
      table.timestamp('created_at').defaultTo(DB.fn.now());
    });
    console.log('Finished Seeding Tables');
    console.log('Creating Triggers');
    await DB.raw(`
          CREATE TRIGGER update_timestamp
          BEFORE UPDATE
          ON ${VISITOR_LOGS}
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
