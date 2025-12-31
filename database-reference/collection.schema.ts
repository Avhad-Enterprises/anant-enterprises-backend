import DB from './index.schema';

export const COLLECTIONS = 'collections';

export const seed = async (dropFirst = false) => {
  try {
    if (dropFirst) {
      console.log('Dropping Tables & Enums');

      await DB.schema.dropTableIfExists(COLLECTIONS);

      await DB.raw(`DROP TYPE IF EXISTS sort_order_enum CASCADE`);
      await DB.raw(`DROP TYPE IF EXISTS collection_type CASCADE`);
      await DB.raw(`DROP TYPE IF EXISTS rule_match_type_enum CASCADE`);

      console.log('Dropped Tables and Enums');
    }

    console.log('Seeding Tables');

    await DB.schema.createTable(COLLECTIONS, table => {
      table.bigIncrements('collection_id').primary().comment('Primary key');
      table
        .string('title', 255)
        .notNullable()
        .comment('Collection name (e.g. “Summer Essentials”)');
      table
        .string('handle', 255)
        .unique()
        .notNullable()
        .comment('URL-friendly slug (like /collections/summer-essentials)');
      table.text('description').nullable().comment('Description (rich text or plain)');

      table
        .enu('type', ['manual', 'automated'], {
          useNative: true,
          enumName: 'collection_type',
        })
        .defaultTo('manual')
        .comment('Type of collection');

      table.jsonb('rules_json').nullable().comment('Used when type = automated');

      table
        .enu('rule_match_type', ['all', 'any'], {
          useNative: true,
          enumName: 'rule_match_type_enum',
        })
        .defaultTo('all')
        .comment('Whether all or any rules must match');

      table
        .enu(
          'sort_order',
          [
            'manual',
            'title-asc',
            'title-desc',
            'price-asc',
            'price-desc',
            'created-desc',
            'created-asc',
          ],
          {
            useNative: true,
            enumName: 'sort_order_enum',
          }
        )
        .defaultTo('manual')
        .comment('Sorting preference');
      table
        .integer('status')
        .notNullable()
        .defaultTo(0)
        .comment('0=pending, 1=active, 2=inactive, 3=deleted');
      table.string('image_url', 500).nullable().comment('Featured image');
      table.string('meta_title', 255).nullable().comment('SEO title');
      table.string('meta_description', 500).nullable().comment('SEO meta description');

      table.jsonb('tags').defaultTo(DB.raw(`'[]'`)).comment('Product tags array');
      table.string('mobile_image', 255).nullable().comment('S3 key for mobile image');

      table.boolean('is_published').defaultTo(true).comment('1 = visible on storefront');
      table.dateTime('publish_date').nullable().comment('Optional scheduled publish');

      table.timestamp('created_at').defaultTo(DB.fn.now());
      table.timestamp('updated_at').defaultTo(DB.fn.now());
      table.bigInteger('created_by').nullable();
      table.bigInteger('updated_by').nullable();
      table.boolean('is_deleted').defaultTo(false);
      table.timestamp('deleted_at').nullable();
      table.bigInteger('deleted_by').unsigned().nullable();
    });

    console.log('Finished Seeding Tables');
    console.log('Creating Triggers');

    await DB.raw(`
      CREATE TRIGGER update_timestamp
      BEFORE UPDATE
      ON ${COLLECTIONS}
      FOR EACH ROW
      EXECUTE PROCEDURE update_timestamp();
    `);

    console.log('Finished Creating Triggers');
  } catch (error) {
    console.error('Seed Error:', error);
  }
};

// exports.seed = seed;
// const run = async () => {
//   seed(true); // force-drop table & enums on each run
// };
// run();
