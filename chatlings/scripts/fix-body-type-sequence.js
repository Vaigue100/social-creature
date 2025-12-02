const { Client } = require('pg');
const config = { ...require('./db-config'), database: 'chatlings' };

async function fixSequence() {
  const client = new Client(config);

  try {
    await client.connect();

    // Get max ID
    const maxId = await client.query('SELECT MAX(id) as max_id FROM dim_body_type');
    const newSeqVal = parseInt(maxId.rows[0].max_id) + 1;

    // Fix sequence
    await client.query(`SELECT setval('dim_body_type_id_seq', ${newSeqVal})`);

    console.log(`✅ Fixed sequence - set to ${newSeqVal}`);
    console.log(`   Max ID in table: ${maxId.rows[0].max_id}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

fixSequence();
