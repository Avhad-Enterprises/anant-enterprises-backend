import DB from './index.schema';

export const PERMISSION = 'permission';

interface PermissionData {
  name: string;
  label: string;
  module: string;
  description: string;
  is_critical: boolean;
}

// Permission Dictionary
const predefinedPermissions: PermissionData[] = [
  // USERS
  {
    name: 'users.view',
    label: 'View Users',
    module: 'users',
    description: 'View user accounts and profiles',
    is_critical: false,
  },
  {
    name: 'users.create',
    label: 'Create User',
    module: 'users',
    description: 'Create a new user account',
    is_critical: true,
  },
  {
    name: 'users.update',
    label: 'Update User',
    module: 'users',
    description: 'Modify existing user information',
    is_critical: false,
  },
  {
    name: 'users.delete',
    label: 'Delete User',
    module: 'users',
    description: 'Delete user accounts permanently',
    is_critical: true,
  },
  {
    name: 'users.ban',
    label: 'Ban User',
    module: 'users',
    description: 'Ban or restrict user accounts',
    is_critical: true,
  },

  // PRODUCTS
  {
    name: 'products.view',
    label: 'View Products',
    module: 'products',
    description: 'View product listings and details',
    is_critical: false,
  },
  {
    name: 'products.create',
    label: 'Create Product',
    module: 'products',
    description: 'Add new products to the store',
    is_critical: true,
  },
  {
    name: 'products.update',
    label: 'Update Product',
    module: 'products',
    description: 'Edit product information',
    is_critical: false,
  },
  {
    name: 'products.delete',
    label: 'Delete Product',
    module: 'products',
    description: 'Delete or disable products',
    is_critical: true,
  },

  // PRODUCT REVIEWS
  {
    name: 'reviews.view',
    label: 'View Reviews',
    module: 'product_reviews',
    description: 'View product reviews',
    is_critical: false,
  },
  {
    name: 'reviews.moderate',
    label: 'Moderate Reviews',
    module: 'product_reviews',
    description: 'Approve or hide reviews',
    is_critical: true,
  },
  {
    name: 'reviews.delete',
    label: 'Delete Reviews',
    module: 'product_reviews',
    description: 'Delete unwanted reviews',
    is_critical: true,
  },

  // COLLECTIONS
  {
    name: 'collections.view',
    label: 'View Collections',
    module: 'collections',
    description: 'View product collections',
    is_critical: false,
  },
  {
    name: 'collections.create',
    label: 'Create Collection',
    module: 'collections',
    description: 'Create new collections',
    is_critical: true,
  },
  {
    name: 'collections.update',
    label: 'Update Collection',
    module: 'collections',
    description: 'Update collection details',
    is_critical: false,
  },
  {
    name: 'collections.delete',
    label: 'Delete Collection',
    module: 'collections',
    description: 'Delete collections',
    is_critical: true,
  },

  // COLLECTION PRODUCTS
  {
    name: 'collection_products.manage',
    label: 'Manage Collection Products',
    module: 'collection_products',
    description: 'Add/remove products from collections',
    is_critical: true,
  },

  // ORDERS
  {
    name: 'orders.view',
    label: 'View Orders',
    module: 'orders',
    description: 'View customer orders',
    is_critical: false,
  },
  {
    name: 'orders.update',
    label: 'Update Orders',
    module: 'orders',
    description: 'Modify order status',
    is_critical: true,
  },
  {
    name: 'orders.refund',
    label: 'Issue Refunds',
    module: 'orders',
    description: 'Refund customer orders',
    is_critical: true,
  },

  // ORDER ITEMS
  {
    name: 'order_items.view',
    label: 'View Order Items',
    module: 'order_items',
    description: 'View items inside customer orders',
    is_critical: false,
  },

  // DISCOUNTS
  {
    name: 'discounts.view',
    label: 'View Discounts',
    module: 'discounts',
    description: 'View discount rules',
    is_critical: false,
  },
  {
    name: 'discounts.create',
    label: 'Create Discount',
    module: 'discounts',
    description: 'Create discount campaigns',
    is_critical: true,
  },
  {
    name: 'discounts.update',
    label: 'Update Discount',
    module: 'discounts',
    description: 'Modify discount rules',
    is_critical: false,
  },
  {
    name: 'discounts.delete',
    label: 'Delete Discount',
    module: 'discounts',
    description: 'Delete discount campaigns',
    is_critical: true,
  },

  // DISCOUNT CODES
  {
    name: 'discount_codes.generate',
    label: 'Generate Discount Codes',
    module: 'discount_codes',
    description: 'Generate single or bulk discount codes',
    is_critical: true,
  },
  {
    name: 'discount_codes.view',
    label: 'View Discount Codes',
    module: 'discount_codes',
    description: 'View all discount codes',
    is_critical: false,
  },
  {
    name: 'discount_codes.delete',
    label: 'Delete Discount Codes',
    module: 'discount_codes',
    description: 'Delete discount codes',
    is_critical: true,
  },

  // BLOGS
  {
    name: 'blogs.view',
    label: 'View Blogs',
    module: 'blogs',
    description: 'View blog posts',
    is_critical: false,
  },
  {
    name: 'blogs.create',
    label: 'Create Blog',
    module: 'blogs',
    description: 'Publish a new blog',
    is_critical: true,
  },
  {
    name: 'blogs.update',
    label: 'Update Blog',
    module: 'blogs',
    description: 'Edit blog posts',
    is_critical: false,
  },
  {
    name: 'blogs.delete',
    label: 'Delete Blog',
    module: 'blogs',
    description: 'Remove blog posts',
    is_critical: true,
  },

  // FAQ
  {
    name: 'faqs.view',
    label: 'View FAQs',
    module: 'faqs',
    description: 'View FAQ list',
    is_critical: false,
  },
  {
    name: 'faqs.manage',
    label: 'Manage FAQs',
    module: 'faqs',
    description: 'Create, update or delete FAQs',
    is_critical: true,
  },

  // GIFTCARDS
  {
    name: 'giftcards.view',
    label: 'View Gift Cards',
    module: 'giftcards',
    description: 'View gift card details',
    is_critical: false,
  },
  {
    name: 'giftcards.create',
    label: 'Create Gift Card',
    module: 'giftcards',
    description: 'Create new gift card codes',
    is_critical: true,
  },
  {
    name: 'giftcards.update',
    label: 'Update Gift Card',
    module: 'giftcards',
    description: 'Update gift card expiry/value',
    is_critical: false,
  },
  {
    name: 'giftcards.disable',
    label: 'Disable Gift Card',
    module: 'giftcards',
    description: 'Block or disable gift cards',
    is_critical: true,
  },
  {
    name: 'giftcards.redeem',
    label: 'Redeem Gift Card',
    module: 'giftcards',
    description: 'Redeem gift card balance',
    is_critical: false,
  },
];

export const seed = async (dropFirst = false) => {
  try {
    if (dropFirst) {
      console.log('Dropping Permission Table…');
      await DB.schema.dropTableIfExists(PERMISSION);
    }
    console.log('Creating Permission Table…');
    const exists = await DB.schema.hasTable(PERMISSION);
    if (!exists) {
      await DB.schema.createTable(PERMISSION, table => {
        table.increments('permission_id').primary();
        table.string('name', 100).unique().notNullable();
        table.string('label', 100);
        table.string('module', 50);
        table.text('description');
        table.boolean('is_critical').defaultTo(false);
        table.timestamp('created_at').defaultTo(DB.fn.now());
        table.timestamp('updated_at').defaultTo(DB.fn.now());
        table.integer('updated_by').nullable();
      });
    }
    console.log('Inserting Permissions…');

    for (const permission of predefinedPermissions) {
      await DB(PERMISSION).insert(permission).onConflict('name').ignore();
    }
    console.log(`Inserted/Updated ${predefinedPermissions.length} permissions`);

    console.log('Creating Trigger…');
    await DB.raw(`
      CREATE TRIGGER update_timestamp
      BEFORE UPDATE ON ${PERMISSION}
      FOR EACH ROW EXECUTE PROCEDURE update_timestamp();
    `);

    console.log('Permission Seeding Completed ✔');
  } catch (error) {
    console.error('Permission Seeder Error:', error);
  }
};

//  exports.seed = seed;
//  const run = async () => {
//  //createProcedure();
//    seed();
//  };
//  run();
