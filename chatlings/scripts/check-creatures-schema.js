const { Client } = require('pg');
const config = require('./db-config');

async function checkSchema() {
  const client = new Client(config);
  await client.connect();

  const res = await client.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'creatures'
    ORDER BY ordinal_position
  `);

  console.log('Creatures table schema:');
  console.table(res.rows);

  await client.end();
}

checkSchema().catch(console.error);
