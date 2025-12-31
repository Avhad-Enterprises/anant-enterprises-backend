import DB from './index.schema';

export const GIFTCARDCODE = 'giftcardcode';

export const seed = async (dropFirst = false) => {
  try {
    if (dropFirst) {
      console.log('Dropping Tables');
      await DB.schema.dropTable(GIFTCARDCODE);
      console.log('Dropped Tables');
    }
    console.log('Seeding Tables');
    await DB.schema.createTable(GIFTCARDCODE, table => {
      table.bigIncrements('id').primary().comment('Primary key');

      table.string('prefix', 50).nullable().comment('Optional code prefix (e.g., GBC-, NEWYEAR-)');

      table.string('suffix', 50).nullable().comment('Optional code suffix (e.g., -2025)');

      table.integer('length').defaultTo(8).notNullable().comment('Length of the random portion');

      table
        .enu('character_set', ['alphabets', 'numbers', 'alphanumeric'], {
          useNative: true,
          enumName: 'giftcard_character_set',
        })
        .defaultTo('alphanumeric')
        .notNullable()
        .comment('Which characters to use');

      table
        .boolean('include_uppercase')
        .defaultTo(true)
        .notNullable()
        .comment('Include uppercase letters (A–Z)');

      table
        .boolean('include_lowercase')
        .defaultTo(false)
        .notNullable()
        .comment('Include lowercase letters (a–z)');

      table
        .boolean('include_numbers')
        .defaultTo(true)
        .notNullable()
        .comment('Include numbers (0–9)');

      table.string('separator', 1).nullable().comment('e.g., - for grouping codes like ABCD-1234');

      table
        .integer('segment_length')
        .defaultTo(0)
        .notNullable()
        .comment('Group size when using separator (0 = no grouping)');
      table.timestamp('created_at').defaultTo(DB.fn.now()).comment('Created timestamp');
      table.timestamp('updated_at').defaultTo(DB.fn.now()).comment('Updated timestamp');
      table.timestamp('deleted_at').nullable().comment('Soft delete timestamp');

      table.integer('created_by').nullable();
      table.integer('updated_by').nullable();
      table.boolean('is_deleted').defaultTo(false);
      table.integer('deleted_by').nullable();
    });

    console.log('Finished Seeding Tables');
    console.log('Creating Triggers');
    await DB.raw(`
          CREATE TRIGGER update_timestamp
          BEFORE UPDATE
          ON ${GIFTCARDCODE}
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
