/**
 * Migration 30: Chatroom System
 *
 * Sets up tables for chatling conversations, mood tracking, and runaway system
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const config = { ...require('./db-config'), database: 'chatlings' };

async function runMigration() {
  const client = new Client(config);

  try {
    await client.connect();
    console.log('Migration 30: Chatroom System\n');
    console.log('='.repeat(80));

    // Read and execute SQL file
    const sqlPath = path.join(__dirname, 'sql', '30_chatroom_system.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Execute the migration
    await client.query(sql);

    console.log('\n✅ Migration 30 completed successfully!');
    console.log('='.repeat(80));

    // Show what was created
    const tables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN (
          'trending_topics',
          'chatling_conversations',
          'conversation_messages',
          'runaway_chatlings',
          'conversation_generation_log'
        )
      ORDER BY table_name
    `);

    console.log('\nTables created:');
    tables.rows.forEach(row => console.log(`  ✓ ${row.table_name}`));

    // Show trending topics count
    const topicsResult = await client.query(`
      SELECT COUNT(*) as count FROM trending_topics WHERE is_active = true
    `);
    console.log(`\nActive trending topics: ${topicsResult.rows[0].count}`);

    // Show mood tracking columns added
    const columnsResult = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'user_rewards'
        AND column_name IN ('mood_status', 'mood_updated_at', 'unhappy_count', 'last_conversation_at')
      ORDER BY column_name
    `);

    console.log('\nMood tracking columns added to user_rewards:');
    columnsResult.rows.forEach(row => console.log(`  ✓ ${row.column_name}`));

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

console.log('================================================================================');
console.log('Migration 30: Chatroom System');
console.log('================================================================================\n');

runMigration();
