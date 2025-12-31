import DB from './index.schema';

export const DISCOUNTS = 'discounts';

export const seed = async (dropFirst = false) => {
  try {
    if (dropFirst) {
      console.log('Dropping Tables');
      await DB.schema.dropTableIfExists(DISCOUNTS);
      console.log('Dropped Tables');
    }
    console.log('Seeding Tables');

    await DB.schema.createTable(DISCOUNTS, table => {
      table.bigIncrements('discount_id').unsigned().primary().comment('Discount campaign ID');
      table.string('title', 180).notNullable().comment('Admin label e.g. Summer 10%');
      table
        .enum('type', ['percentage', 'fixed_amount', 'free_shipping', 'buy_x_get_y'])
        .notNullable()
        .comment('Discount type');

      table
        .enum('create_type', ['single', 'bulk'])
        .defaultTo('single')
        .comment('Single code or bulk generation');

      table.string('prefix', 180).nullable().comment('Prefix for bulk code');
      table.string('sufix', 180).nullable().comment('Suffix for bulk code');
      table.decimal('length', 12, 2).nullable().comment('Length for auto-generated codes');

      table.decimal('value', 12, 2).nullable().comment('% for percentage or amount for fixed');
      table.string('value_currency', 3).nullable().comment('For fixed_amount e.g. INR');
      table
        .enum('applies_to', ['entire_order', 'specific_products', 'specific_collections'])
        .notNullable()
        .comment('Discount application scope');

      table
        .enum('allocation_method', ['across', 'each'])
        .defaultTo('across')
        .comment('How fixed discounts spread across items');

      table
        .enum('min_requirement_type', ['none', 'min_purchase_amount', 'min_quantity', 'min_items'])
        .defaultTo('none')
        .comment('Condition type');

      table
        .decimal('min_requirement_value', 12, 2)
        .nullable()
        .comment('Amount or quantity threshold');

      table.boolean('once_per_customer').defaultTo(false).comment('Limit usage per customer');
      table.integer('total_usage_limit').nullable().comment('Global redemption limit');
      table.integer('usage_count').defaultTo(0).comment('Total redemptions');

      table.timestamp('starts_at').notNullable().comment('Discount start time');
      table.timestamp('ends_at').nullable().comment('Discount end time');
      table
        .enum('status', ['draft', 'active', 'scheduled', 'expired', 'paused'])
        .defaultTo('draft')
        .comment('Lifecycle state');
      table
        .boolean('combines_with_product')
        .defaultTo(false)
        .comment('Can combine with product discounts');
      table
        .boolean('combines_with_order')
        .defaultTo(false)
        .comment('Can combine with order discounts');
      table
        .boolean('combines_with_shipping')
        .defaultTo(false)
        .comment('Can combine with shipping discounts');
      table
        .specificType('prereq_customer_groups_json', 'jsonb')
        .nullable()
        .comment('Customer groups allowed');
      table
        .specificType('prereq_customer_tags_json', 'jsonb')
        .nullable()
        .comment('Customer tags required');
      table
        .specificType('prereq_shipping_countries_json', 'jsonb')
        .nullable()
        .comment('Allowed shipping countries');
      table
        .specificType('rule_products_json', 'jsonb')
        .nullable()
        .comment('Applicable products list');
      table
        .specificType('rule_collections_json', 'jsonb')
        .nullable()
        .comment('Applicable collections list');
      table
        .specificType('bxgy_rules_json', 'jsonb')
        .nullable()
        .comment('Buy X Get Y structured offer rules');
      table
        .specificType('tags', 'jsonb')
        .nullable()
        .defaultTo(DB.raw(`'[]'::jsonb`))
        .comment('Tags or labels');
      table
        .specificType('notes', 'jsonb')
        .nullable()
        .defaultTo(DB.raw(`'[]'::jsonb`))
        .comment('Internal notes');
      table.bigInteger('created_by').unsigned().nullable().comment('Admin who created');
      table.bigInteger('updated_by').unsigned().nullable().comment('Last updated by');
      table.timestamp('created_at').defaultTo(DB.fn.now()).comment('Creation timestamp');
      table.timestamp('updated_at').defaultTo(DB.fn.now()).comment('Last update timestamp');
      table.boolean('is_deleted').defaultTo(false).comment('Soft delete flag');
      table.timestamp('deleted_at').nullable().comment('Soft delete time');
      table.bigInteger('deleted_by').unsigned().nullable().comment('Deleted by admin id');
    });

    console.log('Finished Seeding Tables');
    console.log('Creating Triggers');
    await DB.raw(`
          CREATE TRIGGER update_timestamp
          BEFORE UPDATE
          ON ${DISCOUNTS}
          FOR EACH ROW
          EXECUTE PROCEDURE update_timestamp();
        `);
    console.log('Finished Creating Triggers');
  } catch (error) {
    console.log(error);
  }
};
//  exports.seed = seed;
//  const run = async () => {
//     //createProcedure();
//      seed(true);
//  };
//  run();
