/**
 * Complete Database Reset - Clear All Users and Data
 * WARNING: This will delete EVERYTHING user-related!
 */

const { Client } = require('pg');
const dbConfig = { ...require('./db-config'), database: 'chatlings' };

async function resetAllUsers() {
  const client = new Client(dbConfig);

  try {
    await client.connect();

    console.log('\n⚠️  WARNING: This will delete ALL user data!\n');
    console.log('Deleting in 3 seconds... Press Ctrl+C to cancel\n');

    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('🗑️  Starting database reset...\n');

    // Delete in order to respect foreign key constraints

    // 1. User achievements
    const achievements = await client.query('DELETE FROM user_achievements RETURNING id');
    console.log(`✓ Deleted ${achievements.rowCount} user achievements`);

    // 2. Notifications
    const notifications = await client.query('DELETE FROM notifications RETURNING id');
    console.log(`✓ Deleted ${notifications.rowCount} notifications`);

    // 3. Daily claims
    const dailyClaims = await client.query('DELETE FROM daily_claims RETURNING id');
    console.log(`✓ Deleted ${dailyClaims.rowCount} daily claims`);

    // 4. User rewards (chatlings)
    const rewards = await client.query('DELETE FROM user_rewards RETURNING id');
    console.log(`✓ Deleted ${rewards.rowCount} user rewards (chatlings)`);

    // 5. OAuth accounts
    const oauth = await client.query('DELETE FROM oauth_accounts RETURNING id');
    console.log(`✓ Deleted ${oauth.rowCount} OAuth accounts`);

    // 6. Users
    const users = await client.query('DELETE FROM users RETURNING id');
    console.log(`✓ Deleted ${users.rowCount} users`);

    console.log('\n✅ Database reset complete!\n');
    console.log('All user data has been cleared.');
    console.log('Creatures, achievements, and system data remain intact.\n');
    console.log('You can now:');
    console.log('1. Go to http://localhost:3000/user/login.html');
    console.log('2. Click "Login with Google"');
    console.log('3. Start fresh with a clean account!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

resetAllUsers().catch(err => {
  console.error('Failed:', err.message);
  process.exit(1);
});
