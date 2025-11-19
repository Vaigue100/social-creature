/**
 * Migration 32: Chat Likelihood System
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const config = { ...require('./db-config'), database: 'chatlings' };

async function runMigration() {
  const client = new Client(config);

  try {
    await client.connect();
    console.log('Migration 32: Chat Likelihood System\n');
    console.log('='.repeat(80));

    // Read and execute SQL file
    const sqlPath = path.join(__dirname, 'sql', '32_chat_likelihood_system.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    await client.query(sql);

    console.log('\n✅ Migration 32 completed successfully!');
    console.log('='.repeat(80));

    // Show what was created
    const tables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('user_chat_likelihood', 'inactivity_topics')
      ORDER BY table_name
    `);

    console.log('\nTables created:');
    tables.rows.forEach(row => console.log(`  ✓ ${row.table_name}`));

    const topics = await client.query(`
      SELECT COUNT(*) as count FROM inactivity_topics WHERE is_active = true
    `);
    console.log(`\nInactivity topics: ${topics.rows[0].count}`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

console.log('================================================================================');
console.log('Migration 32: Chat Likelihood System');
console.log('================================================================================\n');

runMigration();
