const { Client } = require('pg');
const config = { ...require('./db-config'), database: 'chatlings' };

async function verify() {
  const client = new Client(config);
  await client.connect();

  const bodyTypes = ['Athletes', 'Knights', 'Dragons', 'Beasts', 'Mages'];

  for (const bt of bodyTypes) {
    console.log(`\n${bt}:`);
    const r = await client.query(`
      SELECT cp.prompt
      FROM creature_prompts cp
      JOIN dim_body_type b ON cp.body_type_id = b.id
      WHERE b.body_type_name = $1
      LIMIT 3
    `, [bt]);

    r.rows.forEach((p, i) => {
      console.log(`  ${i+1}. ${p.prompt.substring(0, 100)}...`);
    });
  }

  await client.end();
}

verify();
