const { Client } = require('pg');
const config = { ...require('./db-config'), database: 'chatlings' };

async function checkStructures() {
  const client = new Client(config);
  await client.connect();

  const tables = [
    'dim_color_scheme',
    'dim_social_activity',
    'dim_social_mood',
    'dim_special_quirk'
  ];

  for (const table of tables) {
    console.log(`\n${table}:`);
    const result = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = $1
      ORDER BY ordinal_position
    `, [table]);

    result.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });
  }

  await client.end();
}

checkStructures();
