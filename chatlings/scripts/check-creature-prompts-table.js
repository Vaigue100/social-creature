const { Client } = require('pg');
const config = { ...require('./db-config'), database: 'chatlings' };

async function checkTable() {
  const client = new Client(config);

  try {
    await client.connect();

    const result = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'creature_prompts'
      ORDER BY ordinal_position
    `);

    console.log('creature_prompts table columns:');
    result.rows.forEach(r => {
      console.log(`  ${r.column_name} (${r.data_type}) - nullable: ${r.is_nullable} - default: ${r.column_default}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

checkTable();
