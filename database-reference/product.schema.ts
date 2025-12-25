import DB from './index.schema';

export const PRODUCT_TABLE = 'products';

export const seed = async (dropFirst = false) => {
  try {
    if (dropFirst) {
      console.log('Dropping Tables');
      await DB.schema.dropTableIfExists(PRODUCT_TABLE);
      console.log('Dropped Tables');
    }
    console.log('Seeding Tables');
    await DB.schema.createTable(PRODUCT_TABLE, table => {
      table.bigIncrements("product_id").unsigned().primary().comment("Product ID"); //
      table.string("amz_product_id", 100).nullable().comment("Optional external ID");
      table.string("product_title", 255).notNullable().comment("Product name");
      table.text("product_description").nullable().comment("Full description");
      table.string("short_description", 500).nullable().comment("Summary");
      table.enum("status", ["draft", "active", "inactive", "archived"]).defaultTo("draft").comment("Product state");

      table.decimal("cost_price", 10, 2).defaultTo(0.00).comment("Cost");
      table.decimal("selling_price", 10, 2).defaultTo(0.00).comment("Selling price");
      table.decimal("compare_at_price", 10, 2).nullable().comment("MRP/Compare-at");

      table.string("sku", 100).unique().notNullable().comment("Stock keeping unit");
      table.string("hsn_no", 20).nullable().comment("HSN/GST code");
      table.string("barcode", 50).nullable().comment("EAN/UPC");
      table.integer("inventory").defaultTo(0).comment("Available stock");

      table.decimal("weight", 8, 2).nullable().comment("Weight (kg)");
      table.decimal("length", 8, 2).nullable().comment("Length (cm/in)");
      table.decimal("breadth", 8, 2).nullable().comment("Breadth (cm/in)");
      table.decimal("height", 8, 2).nullable().comment("Height (cm/in)");

      table.integer("tier_1").unsigned().references("id").inTable("tier_1").onDelete("SET NULL").nullable().comment("Category level 1");
      table.integer("tier_2").unsigned().references("id").inTable("tier_2").onDelete("SET NULL").nullable().comment("Category level 2");
      table.integer("tier_3").unsigned().references("id").inTable("tier_3").onDelete("SET NULL").nullable().comment("Category level 3");
      table.integer("tier_4").unsigned().references("id").inTable("tier_4").onDelete("SET NULL").nullable().comment("Category level 4");
      table.jsonb('tags').defaultTo(DB.raw(`'[]'`)).comment('Product tags array');

      table.string("secondary_title", 255).nullable().comment("Sub-title");
      table.boolean("limited_edition").defaultTo(false).comment("Boolean flag");
      table.boolean("preorder_tag").defaultTo(false).comment("Boolean flag");
      table.timestamp("preorder_date").nullable().comment("Launch date");
      table.boolean("delist").defaultTo(false).comment("Boolean flag");
      table.timestamp("delist_date").nullable();
      table.boolean("gift_wrap").defaultTo(false).comment("Boolean flag");

      table.enum("sales_channel", ["website", "app", "others"]).defaultTo("website").comment("Availability");
      table.string("product_image", 500).nullable().comment("Main image");
      table.text("more_images").nullable().comment("JSON/comma URLs");
      table.string("url", 255).unique().comment("Slug");

      table.string("meta_title", 255).nullable().comment("SEO title");
      table.string("meta_description", 500).nullable().comment("SEO description");

      table.bigInteger('size_id').unsigned().nullable()
        .references('id')
        .inTable('sizes')
        .onDelete('SET NULL');

      table.bigInteger('pickup_location_id').unsigned().nullable()
        .references('id')
        .inTable('pickup_locations')
        .onDelete('SET NULL');

      table.bigInteger('accessory_id').unsigned().nullable()
        .references('accessory_id')
        .inTable('accessory')
        .onDelete('SET NULL');

      table.jsonb('notes').defaultTo(DB.raw(`'[]'`)).comment('Internal notes or metadata');
      table.bigInteger("created_by").unsigned().nullable().comment("Admin/user who created");
      table.bigInteger("updated_by").unsigned().nullable().comment("Last editor");
      table.timestamp("created_at").defaultTo(DB.fn.now()).comment("Creation time");
      table.timestamp("updated_at").defaultTo(DB.fn.now()).comment("Last update");
      table.boolean("is_deleted").defaultTo(false).comment("Soft delete flag");
      table.timestamp("deleted_at").nullable().comment("Soft delete timestamp");
      table.bigInteger("deleted_by").unsigned().nullable().comment("User/admin ID who deleted it");
    });

    console.log('Finished Seeding Tables');
    console.log('Creating Triggers');
    await DB.raw(`
          CREATE TRIGGER update_timestamp
          BEFORE UPDATE
          ON ${PRODUCT_TABLE}
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
