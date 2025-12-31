import DB from './index.schema';

export const AFFILIATE_LINKS = 'affiliate_links';

export const seed = async (dropFirst = false) => {
  try {
    if (dropFirst) {
      console.log('Dropping Tables');
      await DB.schema.dropTable(AFFILIATE_LINKS);
      console.log('Dropped Tables');
    }
    console.log('Seeding Tables');
    // await DB.raw("set search_path to public")
    await DB.schema.createTable(AFFILIATE_LINKS, table => {
      table.bigIncrements('id').primary();
      table.string('title').notNullable();
      table
        .enu('platform', ['Instagram', 'WhatsApp', 'Facebook', 'YouTube', 'Telegram'])
        .notNullable();
      table.string('original_url').notNullable();
      table.string('referral_code').notNullable().unique();
      table.string('generated_referral_link').notNullable();
      table.text('description');
      table.date('expiry_date');
      table.enu('status', ['active', 'inactive', 'expired']).defaultTo('active');
      table.integer('total_clicks').defaultTo(0);
      table.integer('unique_click').defaultTo(0);
      table.integer('signups').defaultTo(0);
      table.integer('successful_orders').defaultTo(0);
      table.decimal('conversion_rate', 10, 2).defaultTo(0);
      table.decimal('total_earnings', 15, 2).defaultTo(0);
      table.jsonb('notes').nullable();
      table.boolean('is_active').defaultTo(true);
      table.boolean('is_deleted').defaultTo(false);
      table.bigInteger('deleted_by').unsigned();
      table.timestamp('deleted_at');
      table.bigInteger('created_by').unsigned();
      table.bigInteger('updated_by').unsigned();
      table.timestamp('created_at').defaultTo(DB.fn.now());
      table.timestamp('updated_at').defaultTo(DB.fn.now());
    });
    console.log('Finished Seeding Tables');
    console.log('Creating Triggers');
    await DB.raw(`
          CREATE TRIGGER update_timestamp
          BEFORE UPDATE
          ON ${AFFILIATE_LINKS}
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
//        //createProcedure();
//        seed();
//    };
//    run();
