/**
 * Run YouTube Integration Migration
 * Adds tables and columns needed for the YouTube chatling discovery game
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const config = { ...require('./db-config'), database: 'chatlings' };

async function runMigration() {
  console.log('='.repeat(80));
  console.log('YouTube Integration Migration');
  console.log('='.repeat(80));
  console.log();

  const client = new Client(config);

  try {
    await client.connect();
    console.log('✓ Connected to database\n');

    const sqlFile = path.join(__dirname, 'sql', 'migration_youtube_integration.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    // Remove the \c chatlings; line as we're already connected
    const cleanedSql = sql.replace(/\\c chatlings;/g, '');

    await client.query(cleanedSql);
    console.log('✓ Migration completed successfully!\n');

    // Show summary
    console.log('New tables created:');
    console.log('  - youtube_channel_assignments');
    console.log('  - notifications');
    console.log('  - achievements');
    console.log('  - user_achievements');
    console.log('\nNew columns added to users table:');
    console.log('  - youtube_user_id');
    console.log('  - youtube_channel_id');
    console.log('  - youtube_access_token');
    console.log('  - youtube_refresh_token');
    console.log('  - youtube_token_expires_at');
    console.log('  - youtube_connected_at');
    console.log();

    await client.end();

  } catch (error) {
    console.error('✗ Migration failed:', error.message);
    console.error(error.stack);
    await client.end();
    process.exit(1);
  }
}

runMigration();
