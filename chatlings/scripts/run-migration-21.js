/**
 * Migration 21: Map new colors to body types
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const config = require('./db-config');

async function runMigration() {
  const client = new Client({ ...config, database: 'chatlings' });

  try {
    await client.connect();
    console.log('Connected to database\n');

    const sqlPath = path.join(__dirname, 'sql', '21_map_new_colors.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Running Migration 21: Map new colors to body types...\n');

    await client.query(sql);

    const results = await client.query(`
      SELECT
        bt.body_type_name,
        COUNT(csbt.color_scheme_id) as color_count
      FROM dim_body_type bt
      LEFT JOIN dim_color_scheme_body_types csbt ON bt.id = csbt.body_type_id
      GROUP BY bt.id, bt.body_type_name
      ORDER BY bt.id
    `);

    console.log('='.repeat(80));
    console.log('Colors Per Body Type:\n');
    results.rows.forEach(row => {
      console.log(`  ${row.body_type_name}: ${row.color_count} colors`);
    });

    console.log('\n✅ Migration 21 completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
