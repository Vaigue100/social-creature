/**
 * Migration 15: Soft delete creatures with null images
 *
 * Sets is_active = false for creatures without valid images
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

    // Read SQL file
    const sqlPath = path.join(__dirname, 'sql', '15_soft_delete_null_images.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Remove \c chatlings command (we're already connected)
    const cleanSql = sql.replace(/\\c chatlings;/g, '');

    console.log('\nRunning migration 15: Soft delete creatures with null images\n');

    // Execute the migration
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
