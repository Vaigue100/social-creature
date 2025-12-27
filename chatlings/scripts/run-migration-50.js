/**
 * Migration 50: Add avatar_ready notification type
 */

const { Client } = require('pg');
const config = { ...require('./db-config'), database: 'chatlings' };

async function runMigration() {
  const client = new Client(config);

  try {
    await client.connect();
    console.log('Migration 50: Add avatar_ready notification type\n');
    console.log('='.repeat(80));

    // Drop existing constraint
    console.log('\n1. Dropping existing check_notification_type constraint...');
    await client.query(`
      ALTER TABLE notifications
      DROP CONSTRAINT IF EXISTS check_notification_type;
    `);
    console.log('✓ Constraint dropped');

    // Add new constraint with avatar_ready included
    console.log('\n2. Adding updated check_notification_type constraint...');
    await client.query(`
      ALTER TABLE notifications
      ADD CONSTRAINT check_notification_type CHECK (
        notification_type IN (
          'daily_box',
          'new_chatling',
          'reward_claimed',
          'daily_visit',
          'achievement',
          'achievement_unlocked',
          'rare_find',
          'collection_milestone',
          'youtube_reminder',
          'new_conversation',
          'chatling_runaway',
          'chatling_recovered',
          'chatling_departed',
          'avatar_ready'
        )
      );
    `);
    console.log('✓ Constraint added with avatar_ready type');

    console.log('\n✅ Migration 50 completed successfully!');
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
console.log('Migration 50: Add avatar_ready notification type');
console.log('================================================================================\n');

runMigration();
