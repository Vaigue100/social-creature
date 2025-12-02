const { Client } = require('pg');
const config = { ...require('./db-config'), database: 'chatlings' };

async function checkTable() {
  const client = new Client(config);

  try {
    await client.connect();

    const result = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'creatures'
      ORDER BY ordinal_position
    `);

    console.log('Creatures table columns:');
    result.rows.forEach(r => {
      console.log(`  ${r.column_name} (${r.data_type}) - nullable: ${r.is_nullable}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

checkTable();
