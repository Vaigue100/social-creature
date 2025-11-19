const { Client } = require('pg');
const config = require('./db-config');

(async () => {
  const client = new Client({ ...config, database: 'chatlings' });
  await client.connect();
  
  const result = await client.query(`
    SELECT column_name, data_type, udt_name
    FROM information_schema.columns 
    WHERE table_name = 'trending_topics'
    ORDER BY ordinal_position
  `);
  
  console.log('trending_topics columns:');
  result.rows.forEach(row => {
    console.log(`  ${row.column_name}: ${row.data_type} (${row.udt_name})`);
  });
  
  await client.end();
})();
