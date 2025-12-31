import DB from './index.schema';

export const PRODUCT_CUSTOMIZATION_GROUPS = 'product_customization_groups';

export const seed = async (dropFirst = false) => {
  try {
    if (dropFirst) {
      console.log('Dropping Tables');
      await DB.schema.dropTable(PRODUCT_CUSTOMIZATION_GROUPS);
      console.log('Dropped Tables');
    }
    console.log('Seeding Tables');
    await DB.schema.createTable(PRODUCT_CUSTOMIZATION_GROUPS, table => {
      table.bigIncrements('id').primary().comment('Unique link ID');
      table
        .bigInteger('product_id')
        .notNullable()
        .references('product_id')
        .inTable('products')
        .onDelete('CASCADE')
        .comment('Linked product');
      table
        .bigInteger('group_id')
        .notNullable()
        .references('group_id')
        .inTable('customization_groups')
        .onDelete('CASCADE')
        .comment('Linked customization group');
      table.timestamp('created_at').defaultTo(DB.fn.now());
      table.timestamp('updated_at').defaultTo(DB.fn.now());
    });
    console.log('Finished Seeding Tables');
    console.log('Creating Triggers');
    await DB.raw(`
          CREATE TRIGGER update_timestamp
          BEFORE UPDATE
          ON ${PRODUCT_CUSTOMIZATION_GROUPS}
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
