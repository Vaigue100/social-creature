const { Client } = require('pg');
const config = { ...require('./db-config'), database: 'chatlings' };

async function checkBodyTypes() {
  const client = new Client(config);

  try {
    await client.connect();

    const result = await client.query('SELECT id, body_type_name FROM dim_body_type ORDER BY body_type_name');

    console.log('Existing body types:');
    result.rows.forEach(bt => {
      console.log(`  ${bt.id}: ${bt.body_type_name}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

checkBodyTypes();
