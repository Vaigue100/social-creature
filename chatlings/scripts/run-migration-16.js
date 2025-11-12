/**
 * Migration 16: Add perchance_image_id column
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const config = { ...require('./db-config'), database: 'chatlings' };

async function runMigration() {
  const client = new Client(config);

  try {
    await client.connect();
    console.log('Connected to database');

    const sqlPath = path.join(__dirname, 'sql', '16_add_perchance_image_id.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    const cleanSql = sql.replace(/\\c chatlings;/g, '');

    console.log('\nRunning migration 16: Add perchance_image_id column\n');

    await client.query(cleanSql);

    console.log('✅ Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
