/**
 * Migration 53: Change default motes for new users to 100
 */

const { Client } = require('pg');
const config = { ...require('./db-config'), database: 'chatlings' };

async function runMigration() {
  const client = new Client(config);

  try {
    await client.connect();
    console.log('Migration 53: Change default motes for new users to 100\n');
    console.log('='.repeat(80));

    // Change default value for motes column
    console.log('\n1. Changing default motes value to 100...');
    await client.query(`
      ALTER TABLE users
      ALTER COLUMN motes SET DEFAULT 100;
    `);
    console.log('✓ Default motes changed to 100');
    console.log('   All new users will now start with 100 Motes');

    console.log('\n✅ Migration 53 completed successfully!');
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
console.log('Migration 53: Change default motes for new users to 100');
console.log('================================================================================\n');

runMigration();
