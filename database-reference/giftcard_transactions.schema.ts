import DB from './index.schema';

export const GIFTCARD_transaction = 'giftcard_transactions';

export const seed = async (dropFirst = false) => {
    try {
        if (dropFirst) {
            console.log('Dropping Tables');
            await DB.schema.dropTable(GIFTCARD_transaction);
            console.log('Dropped Tables');
        }
        console.log('Seeding Tables');
        await DB.schema.createTable(GIFTCARD_transaction, (table) => {
            table.bigIncrements('transaction_id').primary().comment('Transaction ID');

            table.bigInteger('giftcard_id')
                .unsigned()
                .notNullable()
                .references('giftcard_id')
                .inTable('gift_card')
                .onDelete('CASCADE')
                .comment('Gift card reference');

            table.bigInteger('order_id')
                .unsigned()
                .nullable()
                .comment('Order ID if redeemed');

            table.decimal('amount', 12, 2)
                .notNullable()
                .comment('Amount redeemed/adjusted');

            table.enu('type', ['issue', 'redeem', 'refund', 'adjustment'], {
                useNative: true,
                enumName: 'giftcard_transaction_type',
            }).notNullable()
                .comment('Transaction type');

            table.decimal('balance_after', 12, 2)
                .notNullable()
                .comment('Remaining balance after transaction');

            table.bigInteger('performed_by')
                .unsigned()
                .nullable()
                .comment('Admin/User who made change');

            table.string('notes', 255)
                .nullable()
                .comment('Optional notes');

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
          ON ${GIFTCARD_transaction}
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
