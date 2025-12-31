import DB from './index.schema';

export const USERS_TABLE = 'users';

export const seed = async (dropFirst = false) => {
  try {
    if (dropFirst) {
      console.log('Dropping Tables');
      await DB.schema.dropTable(USERS_TABLE);
      console.log('Dropped Tables');
    }
    console.log('Seeding Tables');
    await DB.schema.createTable(USERS_TABLE, table => {
      table.bigIncrements('user_id').primary().comment('Primary key, auto-increment');
      table.string('name', 150).notNullable().comment('User’s full name');
      table.string('email', 190).unique().comment('User email (unique)');
      table.boolean('email_verified').defaultTo(false).comment('1 = verified');
      table.dateTime('email_verified_at').nullable().comment('Timestamp when verified');

      table.string('phone_number', 30).notNullable().comment('User’s phone number');
      table.boolean('phone_verified').defaultTo(false).comment('1 = verified');
      table.dateTime('phone_verified_at').nullable().comment('Timestamp when verified');

      table.string('password_hash', 255).nullable().comment('Encrypted password');
      table.enu('role', ['customer', 'admin']).defaultTo('customer').comment('User role');
      table.string('otp_code', 10).nullable();
      table.dateTime('otp_expires_at').nullable();
      table.string('reset_token_hash', 255).nullable();
      table.dateTime('reset_expires_at').nullable();

      table.string('profile_img', 500).nullable();
      table.enu('gender', ['male', 'female', 'other', 'prefer_not_to_say']).nullable();
      table.date('dob').nullable();
      table.bigInteger('address_id').unsigned().nullable().comment('FK → address_id');

      table.jsonb('tags').defaultTo(DB.raw(`'[]'`)).comment('Tags or labels');
      table.jsonb('notes').nullable();
      table.jsonb('marketing_preferences').nullable();
      table.jsonb('communication_preferences').nullable();
      table.boolean('subscribed_email').defaultTo(true).comment('Newsletter opt-in');

      table.boolean('loyalty_enrolled').defaultTo(false);
      table.integer('loyalty_points').defaultTo(0);
      table.decimal('credit_balance', 12, 2).defaultTo(0.0);

      table.string('customer_segment', 60).nullable();
      table.enu('risk_profile', ['low', 'medium', 'high']).nullable();
      table
        .enu('account_status', ['pending', 'active', 'inactive', 'banned', 'locked'])
        .defaultTo('active')
        .comment('Account lifecycle');

      table.dateTime('last_login_at').nullable();
      table.string('last_login_ip', 45).nullable();
      table.dateTime('last_logout_at').nullable();
      table.integer('failed_login_attempts').defaultTo(0);
      table.dateTime('locked_until').nullable();
      table.string('token').nullable().unique().index();
      table.timestamp('expires_at').nullable();

      table.enu('gdpr_status', ['na', 'pending', 'compliant']).defaultTo('na');
      table.dateTime('consent_marketing_at').nullable();
      table.string('consent_privacy_version', 20).nullable();

      table.string('referral_id', 32).nullable();
      table.string('referred_by', 32).nullable();

      table.jsonb('payment_methods_meta').nullable();
      table.integer('total_orders').defaultTo(0);
      table.decimal('total_spent', 12, 2).defaultTo(0.0);
      table.decimal('average_order_value', 12, 2).nullable();
      table.dateTime('last_order_placed_at').nullable();

      table.jsonb('browsing_history').nullable();
      table.jsonb('customer_groups').nullable();
      table.jsonb('dispute_records').nullable();
      table.jsonb('return_history').nullable();
      table.integer('review_id').defaultTo(0);
      table.integer('support_tickets').defaultTo(0);
      table.jsonb('order_history').nullable();
      table.jsonb('cart_abandonment_record').nullable();
      table.integer('wishlist').defaultTo(0);

      table.bigInteger('created_by').unsigned().nullable().comment('Admin/user who created');
      table.bigInteger('updated_by').unsigned().nullable().comment('Last editor');
      table.timestamp('created_at').defaultTo(DB.fn.now()).comment('Creation time');
      table.timestamp('updated_at').defaultTo(DB.fn.now()).comment('Last update');
      table.boolean('is_deleted').defaultTo(false).comment('Soft delete flag');
      table.timestamp('deleted_at').nullable().comment('Soft delete timestamp');
      table.bigInteger('deleted_by').unsigned().nullable().comment('User/admin ID who deleted it');
    });

    console.log('Finished Seeding Tables');
    console.log('Creating Triggers');
    await DB.raw(`
          CREATE TRIGGER update_timestamp
          BEFORE UPDATE
          ON ${USERS_TABLE}
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
//      seed();
//  };
//  run();
