
import DB from './index.schema';

export const PRODUCT_CUSTOMIZATION_MAPPING = 'product_customization_mapping';

export const seed = async (dropFirst = false) => {

    try {
        if (dropFirst) {
            console.log('Dropping Tables');
            await DB.schema.dropTable(PRODUCT_CUSTOMIZATION_MAPPING);
            console.log('Dropped Tables');
        }
        console.log('Seeding Tables');
        await DB.schema.createTable(PRODUCT_CUSTOMIZATION_MAPPING, table => {
            table.increments('id').primary();
            table.integer('product_id').unsigned().notNullable().references('product_id').inTable('products').onDelete('CASCADE');
            table.integer('group_id').unsigned().notNullable().references('group_id').inTable('customization_groups').onDelete('CASCADE');
            table.boolean('is_mandatory').defaultTo(false);
            table.boolean('position').defaultTo(0);
        });

        console.log('Finished Seeding Tables');
        console.log('Creating Triggers');
        await DB.raw(`
          CREATE TRIGGER update_timestamp
          BEFORE UPDATE
          ON ${PRODUCT_CUSTOMIZATION_MAPPING}
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


