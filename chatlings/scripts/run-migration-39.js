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
    const sqlPath = path.join(__dirname, 'sql', '39_add_notification_link.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Running migration 39: Add notification link column...');

    await client.query(sql);

    console.log('✅ Migration 39 completed successfully!');
    console.log('Notifications now have a link column');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

runMigration();
