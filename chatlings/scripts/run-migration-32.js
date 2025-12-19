/**
 * Migration 32: Add chatling_departed notification type
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const config = { ...require('./db-config'), database: 'chatlings' };

async function runMigration() {
  const client = new Client(config);

  try {
    await client.connect();
    console.log('Migration 32: Add chatling_departed notification type\n');
    console.log('='.repeat(80));

    // Read and execute SQL file
    const sqlPath = path.join(__dirname, 'sql', '32_add_chatling_departed_notification.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Execute the migration
    await client.query(sql);

    console.log('\n✅ Migration 32 completed successfully!');
    console.log('='.repeat(80));

    // Verify constraint
    const result = await client.query(`
      SELECT pg_get_constraintdef(con.oid) as definition
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      WHERE rel.relname = 'notifications'
        AND con.conname = 'check_notification_type'
    `);

    console.log('\nUpdated notification types:');
    console.log(result.rows[0].definition);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

console.log('================================================================================');
console.log('Migration 32: Add chatling_departed notification type');
console.log('================================================================================\n');

runMigration();
