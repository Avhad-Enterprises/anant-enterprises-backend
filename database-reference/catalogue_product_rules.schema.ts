import DB from './index.schema';

export const CATALOGUE_PRODUCT_RULE = 'catalogue_product_rules';

export const seed = async (dropFirst = false) => {
    try {
        if (dropFirst) {
            console.log('Dropping Tables');
            await DB.schema.dropTable(CATALOGUE_PRODUCT_RULE);
            console.log('Dropped Tables');
        }
        console.log('Seeding Tables');
        await DB.schema.createTable(CATALOGUE_PRODUCT_RULE, table => {
            table.bigIncrements('id').primary();
            table.bigInteger('catalogue_id').notNullable().references('catalogue_id').inTable('catalogues');
            table.bigInteger('product_id').notNullable().references('product_id').inTable('product');
            table.enu('rule_type', ['fixed_price', 'percentage', 'amount_off']).defaultTo('fixed_price');
            table.decimal('fixed_price', 10, 2).nullable();
            table.decimal('discount_value', 10, 2).nullable();
            table.integer('min_qty').defaultTo(1);
            table.integer('max_qty').defaultTo(20);
            table.integer('increment_step').defaultTo(1);
            table.timestamp('created_at').defaultTo(DB.fn.now());
            table.timestamp('updated_at').defaultTo(DB.fn.now());
        });

        console.log('Finished Seeding Tables');
        console.log('Creating Triggers');
        await DB.raw(`
          CREATE TRIGGER update_timestamp
          BEFORE UPDATE
          ON ${CATALOGUE_PRODUCT_RULE}
          FOR EACH ROW
          EXECUTE PROCEDURE update_timestamp();
        `);
        console.log('Finished Creating Triggers');
    } catch (error) {
        console.log(error);
    }
};

//    exports.seed = seed;
//    const run = async () => {
//       //createProcedure();
//        seed();
//    };
//    run();

