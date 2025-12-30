import DB from "./index.schema";

export const store_settings = 'store_settings';
export const order_settings = 'order_settings';
export const localization_setting = 'localization_setting';
export const seo_settings = 'seo_settings';
export const analytics_settings = 'analytics_settings';
export const payment_settings = 'payment_settings';


export const seed = async (dropFirst = false) => {
  try {
    //STORE SETTINGS

    const STORE_TABLE = "store_settings";

    if (dropFirst) {
      console.log("Dropping:", STORE_TABLE);
      await DB.schema.dropTableIfExists(STORE_TABLE);
    }

    console.log("Creating:", STORE_TABLE);

    await DB.schema.createTable(STORE_TABLE, (table) => {
      table.increments("id").primary();
      table.string("store_name").notNullable();
      table.string("currency").notNullable();
      table.string("timezone").notNullable();
      table.string("language").notNullable();

      table.timestamp("created_at").defaultTo(DB.fn.now());
      table.timestamp("updated_at").defaultTo(DB.fn.now());
      table.string("updated_by").nullable();
    });

    //ORDER SETTINGS
    const ORDER_TABLE = "order_settings";

    if (dropFirst) {
      console.log("Dropping:", ORDER_TABLE);
      await DB.schema.dropTableIfExists(ORDER_TABLE);
    }

    console.log("Creating:", ORDER_TABLE);

    await DB.schema.createTable(ORDER_TABLE, (table) => {
      table.increments("id").primary();
      table.string("order_prefix").notNullable();
      table.string("order_suffix").notNullable();
      table.integer("order_number_length").nullable();
      table.boolean("enable_auto_increment").defaultTo(true);

      table.integer("created_by").nullable();
      table.integer("updated_by").nullable();

      table.timestamp("created_at").defaultTo(DB.fn.now());
      table.timestamp("updated_at").defaultTo(DB.fn.now());

    });

    //LOCALIZATION SETTINGS
    const LOCAL_TABLE = "localization_settings";

    if (dropFirst) {
      console.log("Dropping:", LOCAL_TABLE);
      await DB.schema.dropTableIfExists(LOCAL_TABLE);
    }

    console.log("Creating:", LOCAL_TABLE);

    await DB.schema.createTable(LOCAL_TABLE, (table) => {
      table.increments("id").primary();
      table.string("native_name").nullable();
      table.string("country").nullable();
      table.string("currency").nullable();
      table.timestamp("created_at").defaultTo(DB.fn.now());
      table.timestamp("updated_at").defaultTo(DB.fn.now());
      table.string("updated_by").nullable();

    });

    // SEO SETTINGS
    const SEO_TABLE = "seo_settings";

    if (dropFirst) {
      console.log("Dropping:", SEO_TABLE);
      await DB.schema.dropTableIfExists(SEO_TABLE);
    }

    console.log("Creating:", SEO_TABLE);

    await DB.schema.createTable(SEO_TABLE, (table) => {
      table.bigIncrements("id").primary();
      table.enu("scope", ["global", "page"]).notNullable();
      table.string("page_type", 50).nullable();
      table.string("seo_title", 255).notNullable();
      table.text("seo_description").notNullable();
      table.text("seo_keywords").nullable();
      table.string("og_title", 255).nullable();
      table.text("og_description").nullable();
      table.string("og_image", 500).nullable();
      table.string("og_type", 50).nullable();
      table.string("twitter_title", 255).nullable();
      table.text("twitter_description").nullable();
      table.string("twitter_image", 500).nullable();
      table.timestamp("created_at").defaultTo(DB.fn.now());
      table.timestamp("updated_at").defaultTo(DB.fn.now());
      table.string("updated_by").nullable();
    });

    // ANALYTICS SETTINGS
    const ANALYTICS_TABLE = "analytics_settings";

    if (dropFirst) {
      console.log("Dropping:", ANALYTICS_TABLE);
      await DB.schema.dropTableIfExists(ANALYTICS_TABLE);
    }

    console.log("Creating:", ANALYTICS_TABLE);

    await DB.schema.createTable(ANALYTICS_TABLE, (table) => {
      table.increments("id").primary();
      table.string("google_analytics_id").nullable();
      table.string("google_tag_manager_id").nullable();
      table.string("facebook_pixel_id").nullable();
      table.string("tiktok_pixel_id").nullable();
      table.string("hotjar_id").nullable();
      table.timestamp("created_at").defaultTo(DB.fn.now());
      table.timestamp("updated_at").defaultTo(DB.fn.now());
      table.string("updated_by").nullable();

    });

    // PAYMENT SETTINGS
    const PAYMENT_TABLE = "payment_settings";

    if (dropFirst) {
      console.log("Dropping:", PAYMENT_TABLE);
      await DB.schema.dropTableIfExists(PAYMENT_TABLE);
    }

    console.log("Creating:", PAYMENT_TABLE);

    await DB.schema.createTable(PAYMENT_TABLE, (table) => {
      table.increments("id").primary();
      table.string("provider_name").nullable();
      table.string("api_key").nullable();
      table.string("secret_key").nullable();
      table.string("webhook_url").nullable();
      table.string("mode").nullable();
      table.boolean("is_active").defaultTo(true);

      table.timestamp("created_at").defaultTo(DB.fn.now());
      table.timestamp("updated_at").defaultTo(DB.fn.now());
      table.string("updated_by").nullable();

    });


    console.log('Finished Seeding Tables');
    console.log('Creating Triggers');

    await DB.raw(`
          CREATE OR REPLACE FUNCTION update_timestamp()
          RETURNS TRIGGER AS $$
          BEGIN
              NEW.updated_at = CURRENT_TIMESTAMP;
              RETURN NEW;
          END;
          $$ LANGUAGE plpgsql;
        `);

    await DB.raw(`
          DROP TRIGGER IF EXISTS update_timestamp ON ${[store_settings, order_settings, localization_setting, seo_settings, analytics_settings, payment_settings]};
          CREATE TRIGGER update_timestamp
          BEFORE UPDATE
          ON ${[store_settings, order_settings, localization_setting, seo_settings, analytics_settings, payment_settings]}
          FOR EACH ROW
          EXECUTE FUNCTION update_timestamp();
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