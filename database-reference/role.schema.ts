import DB from './index.schema';

export const ROLE = 'role';

interface RoleData {
  name: string;
  label: string;
  description: string;
  is_active: boolean;
}

const predefinedRoles: RoleData[] = [
  {
    name: 'ADMIN',
    label: 'Administrator',
    description: 'Platform administrator with management access',
    is_active: true,
  },
  {
    name: 'SUPER_ADMIN',
    label: 'Super Administrator',
    description: 'Full platform access with all permissions',
    is_active: true,
  },
];

export const seed = async (dropFirst = false) => {
  try {
    if (dropFirst) {
      console.log('Dropping Table:', ROLE);
      await DB.schema.dropTableIfExists(ROLE);
    }

    const exists = await DB.schema.hasTable(ROLE);
    if (!exists) {
      console.log('Creating Table:', ROLE);
      await DB.schema.createTable(ROLE, table => {
        table.increments('role_id').primary();
        table.string('name', 50).unique().notNullable();
        table.string('label', 100);
        table.text('description');
        table.boolean('is_active').defaultTo(true);
        table.timestamp('created_at').defaultTo(DB.fn.now());
        table.timestamp('updated_at').defaultTo(DB.fn.now());
      });
    }

    console.log('Inserting predefined roles…');
    await DB(ROLE).insert(predefinedRoles).onConflict('name').ignore();

    await DB.raw(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_trigger WHERE tgname = 'update_timestamp_role'
        ) THEN
          CREATE TRIGGER update_timestamp_role
          BEFORE UPDATE ON ${ROLE}
          FOR EACH ROW EXECUTE PROCEDURE update_timestamp();
        END IF;
      END $$;
    `);

    console.log('Role table seeding completed.');
  } catch (error) {
    console.error('Role Seeder Error:', error);
  }
};

//   exports.seed = seed;
//   const run = async () => {
//      //createProcedure();
//       seed();
//   };
//   run();
