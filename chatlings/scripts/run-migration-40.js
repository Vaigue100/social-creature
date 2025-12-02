/**
 * Migration 40: Push Subscriptions and Notification Preferences
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const config = { ...require('./db-config'), database: 'chatlings' };

async function runMigration() {
  const client = new Client(config);

  try {
    await client.connect();
    console.log('Migration 40: Push Subscriptions and Notification Preferences\n');
    console.log('='.repeat(80));

    // Read and execute SQL file
    const sqlPath = path.join(__dirname, 'sql', '40_push_subscriptions.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    await client.query(sql);

    console.log('\n✅ Migration 40 completed successfully!');
    console.log('='.repeat(80));

    // Show what was added
    const tables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('push_subscriptions', 'push_notification_preferences')
      ORDER BY table_name
    `);

    console.log('\nTables created:');
    tables.rows.forEach(row => console.log(`  ✓ ${row.table_name}`));

    const prefColumns = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'push_notification_preferences'
        AND column_name IN ('daily_box', 'new_chatling', 'achievement', 'chatroom', 'youtube_reminder')
      ORDER BY column_name
    `);

    console.log('\nNotification preference types:');
    prefColumns.rows.forEach(row => console.log(`  ✓ ${row.column_name} (default: ${row.column_default})`));

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

console.log('================================================================================');
console.log('Migration 40: Push Subscriptions and Notification Preferences');
console.log('================================================================================\n');

runMigration();
