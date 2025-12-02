const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const dbConfig = require('./db-config');

async function runMigration() {
  const client = new Client(dbConfig);

  try {
    await client.connect();
    console.log('Connected to database');

    // Read and execute the SQL file
    const sqlFile = path.join(__dirname, 'sql', '41_admin_users.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    console.log('Running migration 41: Admin Users System...\n');

    await client.query(sql);

    console.log('✅ Migration 41 completed successfully!\n');

    // Show admin users (if any exist)
    const adminUsers = await client.query(`
      SELECT id, email, is_admin
      FROM users
      WHERE is_admin = true
    `);

    if (adminUsers.rows.length > 0) {
      console.log('Admin users:');
      adminUsers.rows.forEach(user => {
        console.log(`  - ${user.email} (${user.id})`);
      });
    } else {
      console.log('No admin users yet. Run this to make yourself admin:');
      console.log('  UPDATE users SET is_admin = true WHERE email = \'your.email@gmail.com\';');
    }

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
