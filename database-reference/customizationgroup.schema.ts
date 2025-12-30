import DB from './index.schema';

export const CUSTOMIZATION_GROUPS = 'customization_groups';

export const seed = async (dropFirst = false) => {

    try {
        if (dropFirst) {
            console.log('Dropping Tables');
            await DB.schema.dropTable(CUSTOMIZATION_GROUPS);
            console.log('Dropped Tables');
        }
        console.log('Seeding Tables');
        await DB.schema.createTable(CUSTOMIZATION_GROUPS, (table) => {
            table.bigIncrements('group_id').primary().comment('Unique ID');
            table.string('group_name').notNullable().comment('Name (e.g., "Choose Size")');
            table.string('reference_title')
                .notNullable().unique()
                .comment('Unique internal reference title for identifying groups & combos (CRM/system use)');
            table.text('group_description')
                .nullable()
                .comment('Detailed description shown under group');
            table.boolean('is_required')
                .defaultTo(false)
                .comment('Customer must choose at least one option?');
            table.enu('selection_type', ['single', 'multiple'])
                .notNullable()
                .comment('Single select or multi select');
            table.integer('min_required')
                .defaultTo(0)
                .comment('Minimum required selections');
            table.integer('max_allowed')
                .defaultTo(1)
                .comment('Maximum allowed selections');
            table.integer('sort_order')
                .defaultTo(0)
                .comment('For ordering groups');
            table.enu('status', ['active', 'inactive'])
                .defaultTo('active')
                .comment('Activation status');
            table.enu('price_visibility', ['show', 'hide'])
                .defaultTo('show')
                .comment('Whether to show price difference');
            table.enu('group_type', ['default', 'addon', 'upgrade', 'combo'])
                .defaultTo('default')
                .comment('Categorizes the customization group');
            table.bigInteger('created_by').notNullable().comment('Admin user who created it');
            table.bigInteger('updated_by').nullable().comment('Admin user who last updated');
            table.timestamp('created_at').defaultTo(DB.fn.now());
            table.timestamp('updated_at').defaultTo(DB.fn.now());
            table.boolean('is_deleted')
                .defaultTo(false)
                .comment('Soft delete flag');
            table.integer('deleted_by').nullable().comment('Admin user who deleted');
            table.timestamp('deleted_at').nullable().comment('Deletion timestamp');
        });


        console.log('Finished Seeding Tables');
        await DB.raw(`
          CREATE TRIGGER update_timestamp
          BEFORE UPDATE
          ON ${CUSTOMIZATION_GROUPS}
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
//      //createProcedure();
//      seed();
//  };
//  run();
