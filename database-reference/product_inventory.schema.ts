
import DB from './index.schema';

export const PRODUCT_INVENTORY = 'product_inventory';

export const seed = async (dropFirst = false) => {

    try {
        if (dropFirst) {
            console.log('Dropping Tables');
            await DB.schema.dropTable(PRODUCT_INVENTORY);
            console.log('Dropped Tables');
        }
        console.log('Seeding Tables');
        await DB.schema.createTable(PRODUCT_INVENTORY, table => {
            table.increments('id').primary(); 
            table.integer('product_id').references('product_id') .inTable('products').onDelete('CASCADE');            
            table.integer('location_id').references('id') .inTable('inventory_locations') .onDelete('SET NULL');
            table.integer('stock_quantity').nullable();
            table.integer('reorder_level').nullable();
            table.date('restock_date').nullable();
            table.boolean('is_tracked').nullable();
            table.integer('incoming_stock').nullable();
            table.integer('reserved_stock').nullable();
            table.integer('damaged_Stock').nullable();
            table.boolean('low_stock_alert').defaultTo(false);
            table.timestamp('created_at').defaultTo(DB.fn.now());
            table.timestamp('updated_at').defaultTo(DB.fn.now());
        });

        console.log('Finished Seeding Tables');
        console.log('Creating Triggers');
        await DB.raw(`
          CREATE TRIGGER update_timestamp
          BEFORE UPDATE
          ON ${PRODUCT_INVENTORY}
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


