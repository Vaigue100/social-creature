/**
 * Migration 20: Add more color schemes
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

    const sqlPath = path.join(__dirname, 'sql', '20_add_more_colors.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Running Migration 20: Add more color schemes...\n');

    await client.query(sql);

    const results = await client.query('SELECT COUNT(*) as total FROM dim_color_scheme');
    console.log('='.repeat(80));
    console.log(`Total Colors: ${results.rows[0].total}`);
    console.log('\n✅ Migration 20 completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
