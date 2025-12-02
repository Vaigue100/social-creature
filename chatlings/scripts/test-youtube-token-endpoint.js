/**
 * Simulate what /api/youtube/token returns for each user
 */

const { Client } = require('pg');
const dbConfig = { ...require('./db-config'), database: 'chatlings' };

async function testEndpoint() {
  const client = new Client(dbConfig);

  try {
    await client.connect();

    // Get all users
    const users = await client.query(`
      SELECT id, email FROM users ORDER BY created_at DESC
    `);

    console.log('🔍 Testing /api/youtube/token endpoint for each user:\n');

    for (const user of users.rows) {
      console.log(`User: ${user.email}`);
      console.log(`  ID: ${user.id}`);

      // Simulate the endpoint query
      const result = await client.query(`
        SELECT access_token, refresh_token, token_expires_at
        FROM oauth_accounts
        WHERE user_id = $1 AND provider = 'youtube'
      `, [user.id]);

      if (result.rows.length === 0) {
        console.log(`  Result: { connected: false }`);
      } else {
        console.log(`  Result: { connected: true }`);
        console.log(`  Has access_token: ${result.rows[0].access_token ? 'Yes' : 'No'}`);
        console.log(`  Has refresh_token: ${result.rows[0].refresh_token ? 'Yes' : 'No'}`);
      }
      console.log();
    }

  } finally {
    await client.end();
  }
}

testEndpoint().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
