
import DB from './index.schema';

export const TICKETS = 'tickets';

export const seed = async (dropFirst = false) => {

    try {
        if (dropFirst) {
            console.log('Dropping Tables');
            await DB.schema.dropTable(TICKETS);
            console.log('Dropped Tables');
        }
        console.log('Seeding Tables');
        await DB.schema.createTable(TICKETS, (table) => {
            table.bigIncrements('ticket_id').primary().comment('Ticket ID');

            table.string('ticket_number', 50).unique().notNullable().comment('e.g. TCK-20250210-001');

            table.bigInteger('customer_id').nullable()
                .references('user_id').inTable('users').onDelete('SET NULL');

            table.bigInteger('order_id').nullable()
                .references('order_id').inTable('orders').onDelete('SET NULL');

            table.bigInteger('assigned_to').nullable()
                .references('user_id').inTable('users').onDelete('SET NULL');

            table.string('subject', 255).notNullable();
            table.string('category', 100).notNullable();

            table.enu('priority', ['low', 'medium', 'high', 'urgent']).defaultTo('medium');
            table.enu('status', ['open', 'pending', 'waiting_customer', 'resolved', 'closed']).defaultTo('open');
            table.enu('channel', ['email', 'chat', 'whatsapp', 'system']).defaultTo('system');
            table.enu('created_via', ['store', 'email', 'admin']).defaultTo('store');

            table.jsonb('tags')
                .notNullable()
                .defaultTo(DB.raw(`'[]'::jsonb`))
                .comment('e.g. ["refund","VIP"]');

            table.text('notes').nullable().comment('Agent notes or description');

            table.jsonb('metadata')
                .nullable()
                .defaultTo(DB.raw(`'{}'::jsonb`))
                .comment('Extra data (browser, device, etc.)');

            table.timestamp('last_message_at').notNullable().defaultTo(DB.fn.now());
            table.boolean('is_active').defaultTo(true);
            table.timestamp('created_at').defaultTo(DB.fn.now());

            table.integer('created_by').notNullable()
                .references('user_id').inTable('users').onDelete('SET NULL');

            table.timestamp('updated_at').defaultTo(DB.fn.now());
            table.integer('updated_by').nullable();
            table.boolean('is_deleted').defaultTo(false);
            table.integer('deleted_by').nullable();
            table.timestamp('deleted_at').nullable();
        });


        console.log('Finished Seeding Tables');
        console.log('Creating Triggers');
        await DB.raw(`
          CREATE TRIGGER update_timestamp
          BEFORE UPDATE
          ON ${TICKETS}
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


