import DB from './index.schema';

export const VISITOR_DEVICES = 'visitor_devices';

export const seed = async (dropFirst = false) => {
  try {
    if (dropFirst) {
      console.log('Dropping Tables');
      await DB.schema.dropTable(VISITOR_DEVICES);
      console.log('Dropped Tables');
    }
    console.log('Seeding Tables');
    await DB.schema.createTable(VISITOR_DEVICES, table => {
      table.bigIncrements('device_id').primary();

      table.string('session_id').notNullable();
      table
        .foreign('session_id')
        .references('session_id')
        .inTable('visitor_sessions')
        .onDelete('CASCADE');

      table.text('user_agent').notNullable();
      table.string('browser_name').nullable();
      table.string('browser_version').nullable();
      table.string('os_name').nullable();
      table.string('os_version').nullable();

      table
        .enum('device_type', ['desktop', 'mobile', 'tablet'], {
          useNative: true,
          enumName: 'device_type_enum',
        })
        .notNullable()
        .defaultTo('desktop');

      table.integer('screen_width').nullable();
      table.integer('screen_height').nullable();
      table.string('language').nullable();
      table.string('timezone').nullable();
      table.timestamp('created_at').defaultTo(DB.fn.now());
    });
    console.log('Finished Seeding Tables');
    console.log('Creating Triggers');
    await DB.raw(`
          CREATE TRIGGER update_timestamp
          BEFORE UPDATE
          ON ${VISITOR_DEVICES}
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
