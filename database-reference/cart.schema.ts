
import DB from './index.schema';

export const CART = 'cart';

export const seed = async (dropFirst = false) => {

    try {
        if (dropFirst) {
            console.log('Dropping Tables');
            await DB.schema.dropTable(CART);
            console.log('Dropped Tables');
        }
        console.log('Seeding Tables');
        await DB.schema.createTable(CART, table => {
            table.bigIncrements('cart_id').primary().comment('Unique cart ID');
            table.bigInteger('user_id')
                .nullable()
                .comment('For logged-in users');
            table.string('session_id', 100)
                .nullable()
                .comment('For guests');
            table.string('currency', 3)
                .defaultTo('INR')
                .comment('Store currency source');
            table.decimal('subtotal', 12, 2)
                .notNullable()
                .defaultTo(0.00)
                .comment('Sum of items BEFORE discounts');
            table.decimal('discount_total', 12, 2)
                .notNullable()
                .defaultTo(0.00)
                .comment('Discount applied');
            table.decimal('giftcard_total', 12, 2)
                .notNullable()
                .defaultTo(0.00)
                .comment('Gift card applied');
            table.decimal('shipping_total', 12, 2)
                .notNullable()
                .defaultTo(0.00)
                .comment('Shipping total');
            table.decimal('tax_total', 12, 2)
                .notNullable()
                .defaultTo(0.00)
                .comment('Total tax');
            table.decimal('grand_total', 12, 2)
                .notNullable()
                .defaultTo(0.00)
                .comment('Final payable total');
            table.enu('cart_status', ['active', 'converted', 'abandoned'], {
                useNative: true,
                enumName: 'cart_status_enum'
            })
                .notNullable()
                .defaultTo('active')
                .comment('Cart state');
            table.enu('source', ['web', 'app'], {
                useNative: true,
                enumName: 'cart_source_enum'
            })
                .notNullable()
                .defaultTo('web')
                .comment('Origin of cart');
            table.timestamp('created_at').defaultTo(DB.fn.now());
            table.timestamp('updated_at').defaultTo(DB.fn.now());
            table.boolean('is_deleted').defaultTo(false);
            table.timestamp('deleted_at').nullable();
            table.bigInteger('created_by').nullable();
            table.bigInteger('updated_by').nullable();
            table.bigInteger('deleted_by').nullable();
        });

        console.log('Finished Seeding Tables');
        console.log('Creating Triggers');
        await DB.raw(`
          CREATE TRIGGER update_timestamp
          BEFORE UPDATE
          ON ${CART}
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


