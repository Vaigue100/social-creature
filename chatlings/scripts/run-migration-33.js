/**
 * Migration 33: YouTube Integration Tracking
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const config = { ...require('./db-config'), database: 'chatlings' };

async function runMigration() {
  const client = new Client(config);

  try {
    await client.connect();
    console.log('Migration 33: YouTube Integration Tracking\n');
    console.log('='.repeat(80));

    // Read and execute SQL file
    const sqlPath = path.join(__dirname, 'sql', '33_youtube_integration_tracking.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    await client.query(sql);

    console.log('\n✅ Migration 33 completed successfully!');
    console.log('='.repeat(80));

    // Show what was added
    const columns = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'oauth_accounts'
        AND column_name = 'youtube_integrated_at'
    `);

    if (columns.rows.length > 0) {
      console.log('\nColumn added:');
      console.log(`  ✓ oauth_accounts.youtube_integrated_at (${columns.rows[0].data_type})`);
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

console.log('================================================================================');
console.log('Migration 33: YouTube Integration Tracking');
console.log('================================================================================\n');

runMigration();
