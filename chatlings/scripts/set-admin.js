/**
 * Set Admin Script
 * Makes a user an administrator
 *
 * Usage: node set-admin.js your.email@gmail.com
 */

const { Client } = require('pg');
const dbConfig = require('./db-config');

async function setAdmin() {
  const email = process.argv[2];

  if (!email) {
    console.error('Usage: node set-admin.js <email>');
    console.error('Example: node set-admin.js your.email@gmail.com');
    process.exit(1);
  }

  const client = new Client(dbConfig);

  try {
    await client.connect();

    // Check if user exists
    const userCheck = await client.query(`
      SELECT id, email, is_admin
      FROM users
      WHERE email = $1
    `, [email]);

    if (userCheck.rows.length === 0) {
      console.error(`❌ User not found: ${email}`);
      console.log('\nMake sure the user has logged in at least once to create their account.');
      process.exit(1);
    }

    const user = userCheck.rows[0];

    if (user.is_admin) {
      console.log(`✅ User is already an admin: ${email}`);
      return;
    }

    // Set as admin
    await client.query(`
      UPDATE users
      SET is_admin = true
      WHERE id = $1
    `, [user.id]);

    console.log(`\n✅ SUCCESS! User is now an admin: ${email}`);
    console.log(`\nThey can now access:`);
    console.log(`  - Admin panel: http://localhost:3000/admin`);
    console.log(`  - All admin API endpoints`);
    console.log(`  - Animation management`);
    console.log(`  - Family browser`);
    console.log(`  - Conversation review`);

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

setAdmin();
