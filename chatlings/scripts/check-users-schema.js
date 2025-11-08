const { Client } = require('pg');
const config = require('./db-config');

async function checkSchema() {
  const client = new Client(config);
  await client.connect();

  const res = await client.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'users'
    ORDER BY ordinal_position
  `);

  console.log('Users table schema:');
  console.table(res.rows);

  // Check for primary key
  const pk = await client.query(`
    SELECT constraint_name, constraint_type
    FROM information_schema.table_constraints
    WHERE table_name = 'users' AND constraint_type = 'PRIMARY KEY'
  `);

  console.log('\nPrimary key:');
  console.table(pk.rows);

  await client.end();
}

checkSchema().catch(console.error);
