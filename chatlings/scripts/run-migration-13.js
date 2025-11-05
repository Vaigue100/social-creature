/**
 * Run Migration 13: Social Dimensions
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const config = { ...require('./db-config'), database: 'chatlings' };

async function runMigration() {
  const client = new Client(config);

  try {
    await client.connect();
    console.log('Connected to database...\n');

    // Read migration file
    const migrationPath = path.join(__dirname, 'sql', '13_social_dimensions.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Running Migration 13: Social Dimensions');
    console.log('This will:');
    console.log('  - Drop old fantasy dimension tables');
    console.log('  - Create new social media dimension tables');
    console.log('  - Create creature_prompts table');
    console.log('  - Update creatures table structure\n');

    // Execute migration
    await client.query(sql);

    console.log('✅ Migration 13 completed successfully!\n');

    await client.end();

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

console.log('================================================================================');
console.log('Migration 13: Social Dimensions');
console.log('================================================================================\n');

runMigration();
