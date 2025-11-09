const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const config = { ...require('./db-config'), database: 'chatlings' };

async function updateCuteBodyTypes() {
  const client = new Client(config);

  try {
    await client.connect();
    console.log('🎨 Updating cute body types...\n');

    const sqlPath = path.join(__dirname, 'sql', 'update_cute_body_types.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await client.query(sql);

    console.log('✅ Updated body types 1, 2, 3, 5, 6 to include "cute" and "adorable"\n');

    const result = await client.query('SELECT id, body_type_name, prompt_text FROM dim_body_type ORDER BY id');
    console.log('📋 All body types:');
    for (const row of result.rows) {
      console.log(`   ${row.id}. ${row.body_type_name}: ${row.prompt_text}`);
    }
    console.log('');

  } catch (error) {
    console.error('❌ Update failed:', error.message);
    console.error(error.stack);
    await client.end();
    process.exit(1);
  }

  await client.end();
}

updateCuteBodyTypes();
