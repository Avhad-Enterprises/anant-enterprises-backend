import DB from './index.schema';

export const CUSTOMER_SEGMENTS = 'customer_segments';

export const seed = async (dropFirst = false) => {
  try {
    if (dropFirst) {
      console.log('Dropping Tables');
      await DB.schema.dropTableIfExists(CUSTOMER_SEGMENTS);
      console.log('Dropped Tables');
    }
    console.log('Seeding Tables');

    await DB.schema.createTable(CUSTOMER_SEGMENTS, table => {
      table.bigIncrements('segment_id').primary().comment('Primary key');
      table
        .string('segment_code', 100)
        .notNullable()
        .unique()
        .comment('Short internal code (e.g., VIP30D, HIGHSPENDER)');
      table.string('name', 255).notNullable().comment('User-visible segment name');
      table
        .enu('type', ['manual', 'automated'], {
          useNative: true,
          enumName: 'segment_type_enum',
        })
        .notNullable()
        .defaultTo('manual')
        .comment('Segment type');
      table
        .enu('match_type', ['all', 'any'], {
          useNative: true,
          enumName: 'segment_match_type_enum',
        })
        .notNullable()
        .defaultTo('all')
        .comment('AND/OR logic for rules');
      table
        .jsonb('rules')
        .nullable()
        .comment('JSON array of rule objects {field, operator, value}');
      table.string('auto_refresh_interval', 50).nullable().comment('Frequency: 15m, 1h, 6h, daily');
      table
        .integer('estimated_users_count')
        .defaultTo(0)
        .comment('Cached number of users in this segment');
      table
        .timestamp('last_refreshed_at')
        .nullable()
        .comment('Last time the rule engine refreshed the results');
      table.jsonb('tags').defaultTo(DB.raw(`'[]'`)).comment('Array of segment tags');
      table.jsonb('notes').defaultTo(DB.raw(`'[]'`)).comment('Internal notes');
      table
        .boolean('is_active')
        .defaultTo(true)
        .comment('Frontend flag: true = active, false = inactive');
      table.boolean('is_deleted').defaultTo(false).comment('Soft delete flag');
      table
        .bigInteger('deleted_by')
        .unsigned()
        .nullable()
        .comment('User ID who deleted this record');
      table.timestamp('deleted_at').nullable().comment('Timestamp when record was deleted');
      table
        .bigInteger('created_by')
        .unsigned()
        .nullable()
        .comment('User ID who created this record');
      table
        .bigInteger('updated_by')
        .unsigned()
        .nullable()
        .comment('User ID who updated this record');
      table.timestamp('created_at').defaultTo(DB.fn.now()).comment('Record created timestamp');
      table.timestamp('updated_at').defaultTo(DB.fn.now()).comment('Last updated timestamp');
    });

    console.log('Finished Seeding Tables');
    console.log('Creating Triggers');
    await DB.raw(`
          CREATE TRIGGER update_timestamp
          BEFORE UPDATE
          ON ${CUSTOMER_SEGMENTS}
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
//     //createProcedure();
//      seed(true);
//  };
//  run();
