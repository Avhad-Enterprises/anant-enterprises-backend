import DB from './index.schema';

export const TICKET_MESSAGES = 'ticket_messages';

export const seed = async (dropFirst = false) => {
  try {
    if (dropFirst) {
      console.log('Dropping Tables');
      await DB.schema.dropTable(TICKET_MESSAGES);
      console.log('Dropped Tables');
    }
    console.log('Seeding Tables');

    await DB.schema.createTable(TICKET_MESSAGES, table => {
      table.bigIncrements('ticketmessage_id').primary().comment('Primary key');
      table
        .bigInteger('ticket_id')
        .notNullable()
        .references('ticket_id')
        .inTable('tickets')
        .onDelete('CASCADE')
        .comment('Linked ticket');
      table
        .enu('sender_type', ['customer', 'agent', 'system', 'note'])
        .notNullable()
        .defaultTo('customer')
        .comment('Sender type (note = internal note by agent)');

      table.bigInteger('sender_id').nullable().comment('Sender user_id (customer/agent)');

      table.text('message').notNullable().comment('Message content');

      table.jsonb('attachments').nullable().comment('e.g. [{"file_url":"...","type":"image"}]');

      table.timestamp('created_at').defaultTo(DB.fn.now()).comment('Timestamp of message');
      table.integer('created_by').notNullable();
      table.timestamp('updated_at').defaultTo(DB.fn.now());
      table.integer('updated_by').nullable();
      table.boolean('is_deleted').defaultTo(false);
      table.integer('deleted_by').nullable();
      table.timestamp('deleted_at').nullable().comment('Soft delete');
    });

    console.log('Finished Seeding Tables');
    console.log('Creating Triggers');
    await DB.raw(`
          CREATE TRIGGER update_timestamp
          BEFORE UPDATE
          ON ${TICKET_MESSAGES}
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
