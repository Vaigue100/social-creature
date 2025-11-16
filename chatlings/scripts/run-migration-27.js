const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const config = { ...require('./db-config'), database: 'chatlings' };

async function runMigration() {
  const client = new Client(config);

  try {
    await client.connect();
    console.log('Connected to database');

    // Read the SQL file
    const sqlPath = path.join(__dirname, 'sql', '27_oauth_accounts.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Running migration 27: Create OAuth accounts table...');
    await client.query(sql);

    console.log('Migration 27 completed successfully!');

  } catch (error) {
    console.error('Error running migration:', error);
    throw error;
  } finally {
    await client.end();
  }
}

runMigration();
