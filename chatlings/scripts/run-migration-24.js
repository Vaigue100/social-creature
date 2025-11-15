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
    const sqlPath = path.join(__dirname, 'sql', '24_singularize_body_types.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Running migration 24: Singularize body type names...');
    await client.query(sql);

    console.log('Migration 24 completed successfully!');

  } catch (error) {
    console.error('Error running migration:', error);
    throw error;
  } finally {
    await client.end();
  }
}

runMigration();
