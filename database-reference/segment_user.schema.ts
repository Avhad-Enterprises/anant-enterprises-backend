import DB from "./index.schema";

export const SEGMENT_USERS = "segment_users";

export const seed = async (dropFirst = false) => {
    try {
        if (dropFirst) {
            console.log("Dropping Tables");
            await DB.schema.dropTableIfExists(SEGMENT_USERS);
            console.log("Dropped Tables");
        }
        console.log("Seeding Tables");

        await DB.schema.createTable(SEGMENT_USERS, table => {
            table.bigIncrements("segment_users_id").primary().comment("Primary key");

            table.bigInteger("segment_id")
                .unsigned()
                .notNullable()
                .references("segment_id")
                .inTable("customer_segments")
                .onDelete("CASCADE")
                .comment("FK → customer_segments.segment_id");

            table.bigInteger("user_id")
                .unsigned()
                .notNullable()
                .references("user_id")
                .inTable("users")
                .onDelete("CASCADE")
                .comment("FK → users.user_id");

            table.boolean("is_active").defaultTo(true).comment("Frontend flag: true = active, false = inactive");
            table.boolean("is_deleted").defaultTo(false).comment("Soft delete flag");
            table.bigInteger("deleted_by").unsigned().nullable().comment("User ID who deleted this record");
            table.timestamp("deleted_at").nullable().comment("Timestamp when record was deleted");
            table.bigInteger("created_by").unsigned().nullable().comment("User ID who created this record");
            table.bigInteger("updated_by").unsigned().nullable().comment("User ID who updated this record");
            table.timestamp("created_at").defaultTo(DB.fn.now()).comment("Record created timestamp");
            table.timestamp("updated_at").defaultTo(DB.fn.now()).comment("Last updated timestamp");
        });


        console.log("Finished Seeding Tables");
        console.log("Creating Triggers");
        await DB.raw(`
          CREATE TRIGGER update_timestamp
          BEFORE UPDATE
          ON ${SEGMENT_USERS}
          FOR EACH ROW
          EXECUTE PROCEDURE update_timestamp();
        `);
        console.log("Finished Creating Triggers");
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
