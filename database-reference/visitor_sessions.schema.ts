import DB from './index.schema';

export const VISITOR_SESSIONS = 'visitor_sessions';

export const seed = async (dropFirst = false) => {
  try {
    if (dropFirst) {
      console.log('Dropping Tables');
      await DB.schema.dropTable(VISITOR_SESSIONS);
      console.log('Dropped Tables');
    }
    console.log('Seeding Tables');
    // await DB.raw("set search_path to public")
    await DB.schema.createTable(VISITOR_SESSIONS, table => {
      table.string('session_id').primary();
      table.bigInteger('user_id').nullable();

      table
        .enu('visitor_type', ['guest', 'registered', 'customer'])
        .notNullable()
        .defaultTo('guest');

      table.string('ip_address', 100).notNullable();
      table.string('country', 100).nullable();
      table.string('region', 100).nullable();
      table.string('city', 100).nullable();
      table.timestamp('started_at').notNullable();
      table.timestamp('ended_at').nullable();
      table.integer('duration_seconds').defaultTo(0);
      table.string('entry_url').notNullable();
      table.string('exit_url').nullable();
      table.string('referrer_url').nullable();
      table.string('utm_source').nullable();
      table.string('utm_medium').nullable();
      table.string('utm_campaign').nullable();
      table.boolean('is_bounce').defaultTo(false);
      table.integer('total_events').defaultTo(0);
      table.timestamp('created_at').defaultTo(DB.fn.now());
      table.timestamp('updated_at').defaultTo(DB.fn.now());
    });
    console.log('Finished Seeding Tables');
    console.log('Creating Triggers');
    await DB.raw(`
          CREATE TRIGGER update_timestamp
          BEFORE UPDATE
          ON ${VISITOR_SESSIONS}
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
