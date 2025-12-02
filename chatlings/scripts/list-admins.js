/**
 * List Admins Script
 * Shows all users with admin privileges
 *
 * Usage: node list-admins.js
 */

const { Client } = require('pg');
const dbConfig = require('./db-config');

async function listAdmins() {
  const client = new Client(dbConfig);

  try {
    await client.connect();

    const result = await client.query(`
      SELECT
        id,
        email,
        created_at,
        last_login_at,
        is_admin
      FROM users
      WHERE is_admin = true
      ORDER BY created_at ASC
    `);

    console.log('\n' + '='.repeat(80));
    console.log('ADMIN USERS');
    console.log('='.repeat(80));

    if (result.rows.length === 0) {
      console.log('\n❌ No admin users found.');
      console.log('\nTo make yourself an admin, run:');
      console.log('  node scripts/set-admin.js your.email@gmail.com\n');
      return;
    }

    console.log(`\n✅ Found ${result.rows.length} admin user(s):\n`);

    result.rows.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Created: ${new Date(user.created_at).toLocaleString()}`);
      console.log(`   Last login: ${user.last_login_at ? new Date(user.last_login_at).toLocaleString() : 'Never'}`);
      console.log('');
    });

    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

listAdmins();
