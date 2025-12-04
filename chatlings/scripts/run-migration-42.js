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
    const sqlPath = path.join(__dirname, 'sql', '42_idle_game_state.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Running migration 42: Create idle game state table...');

    await client.query(sql);

    console.log('✅ Migration 42 completed successfully!');
    console.log('✓ Created idle_game_state table');
    console.log('✓ Added indexes and triggers');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

runMigration();
