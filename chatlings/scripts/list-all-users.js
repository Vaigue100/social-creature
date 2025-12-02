/**
 * List all users and their YouTube connection status
 */

const { Client } = require('pg');
const dbConfig = { ...require('./db-config'), database: 'chatlings' };

async function listAllUsers() {
  const client = new Client(dbConfig);

  try {
    await client.connect();

    console.log('📊 All users in system:\n');

    const users = await client.query(`
      SELECT
        u.id,
        u.email,
        u.last_active_at,
        (SELECT COUNT(*) FROM oauth_accounts oa WHERE oa.user_id = u.id AND oa.provider = 'youtube') as has_youtube
      FROM users u
      ORDER BY u.created_at DESC
    `);

    users.rows.forEach(user => {
      console.log(`User: ${user.email}`);
      console.log(`  ID: ${user.id}`);
      console.log(`  Last active: ${user.last_active_at || 'Never'}`);
      console.log(`  YouTube connected: ${user.has_youtube > 0 ? 'Yes' : 'No'}`);
      console.log();
    });

    console.log(`\nTotal users: ${users.rows.length}`);
    console.log(`Users with YouTube: ${users.rows.filter(u => u.has_youtube > 0).length}`);

  } finally {
    await client.end();
  }
}

listAllUsers().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
