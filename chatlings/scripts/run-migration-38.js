const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const dbConfig = require('./db-config');

async function runMigration() {
  const client = new Client(dbConfig);

  try {
    await client.connect();
    console.log('Connected to database');

    // Read the SQL file
    const sqlPath = path.join(__dirname, 'sql', '38_fix_user_rewards_uuid.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Running migration 38: Fix all UUID defaults...');

    await client.query(sql);

    console.log('✅ Migration 38 completed successfully!');
    console.log('All tables with UUID id columns will now auto-generate UUIDs');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

runMigration();
