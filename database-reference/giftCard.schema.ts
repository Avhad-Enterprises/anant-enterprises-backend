import DB from './index.schema';

export const GIFT_CARD = 'gift_card';

export const seed = async (dropFirst = false) => {
  try {
    if (dropFirst) {
      console.log('Dropping Tables');
      await DB.schema.dropTable(GIFT_CARD);
      console.log('Dropped Tables');
    }
    console.log('Seeding Tables');
    await DB.schema.createTable(GIFT_CARD, table => {
      table.bigIncrements('giftcard_id').primary().comment('Gift card ID');
      table
        .string('code', 100)
        .notNullable()
        .unique()
        .comment('The actual redeemable code (e.g., GIFT-3AB9KQ)');
      table.decimal('initial_value', 12, 2).notNullable().comment('Total starting value');
      table.decimal('balance', 12, 2).notNullable().comment('Remaining balance');
      table.string('currency', 3).defaultTo('INR').comment('Currency code');

      table
        .enu('status', ['active', 'partially_used', 'redeemed', 'expired', 'disabled'])
        .defaultTo('active');

      table.bigInteger('user_id').nullable().comment('FK to users (nullable for guest checkout)');

      table
        .bigInteger('issued_by')
        .unsigned()
        .nullable()
        .comment('Admin ID who created (if manual)');

      table.string('recipient_email', 190).nullable().comment('Where it’s sent');
      table.string('recipient_name', 150).nullable().comment('Optional');
      table.string('message', 255).nullable().comment('Message from sender');

      table.dateTime('expires_at').nullable().comment('Expiry date');

      table.boolean('is_bulk_created').defaultTo(false).comment('1 if created via bulk generator');

      table.string('log_ip', 45).nullable().comment('IP of action');
      table.string('log_user_agent', 255).nullable().comment('Browser/device info');

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
          ON ${GIFT_CARD}
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
