/**
 * Migration 51: Add motes currency to users table
 */

const { Client } = require('pg');
const config = { ...require('./db-config'), database: 'chatlings' };

async function runMigration() {
  const client = new Client(config);

  try {
    await client.connect();
    console.log('Migration 51: Add motes currency to users table\n');
    console.log('='.repeat(80));

    // Add motes column to users table
    console.log('\n1. Adding motes column to users table...');
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS motes INTEGER DEFAULT 0 NOT NULL;
    `);
    console.log('✓ Motes column added');

    // Add index for potential leaderboard queries
    console.log('\n2. Adding index on motes column...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_motes ON users(motes DESC);
    `);
    console.log('✓ Index added');

    // Give all existing users a starting balance (optional)
    console.log('\n3. Setting starting balance for existing users...');
    await client.query(`
      UPDATE users
      SET motes = 100
      WHERE motes = 0;
    `);
    const result = await client.query('SELECT COUNT(*) as count FROM users WHERE motes > 0');
    console.log(`✓ ${result.rows[0].count} users received 100 starting Motes`);

    console.log('\n✅ Migration 51 completed successfully!');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

console.log('================================================================================');
console.log('Migration 51: Add motes currency to users table');
console.log('================================================================================\n');

runMigration();
